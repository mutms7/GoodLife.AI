import { normalizeCoachText } from "@/lib/advice";
import { PLAYBOOK } from "@/lib/coach-playbook";
import { fallbackTopic, readTopicChoice, topicMenu, type Topic } from "@/lib/playbook";
import { buildHistoryMessages, buildSystemPrompt, buildTopicSystemPrompt, buildTopicUserPrompt, buildUserPrompt, looksLikeLeak, makeFence, prescribesMedication, type Turn } from "@/lib/prompt";

/* 0.5B was too small to hold the rules it was given. It wrote listicles when
 * the voice asked for a few sentences, and it recommended a sleeping pill it
 * had invented the generic name for, with the rule against that sitting in its
 * own prompt. 1.5B costs more download and more time per reply and follows a
 * negative instruction far better, which is most of what this app asks for. */
export const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
export const MODEL_LABEL = "Qwen 1.5B";
/** Rounded, and stated everywhere we ask someone to start the download. This
 *  tracks WebLLM's own figure for the model, which sits a little above the
 *  weights on disk, so the number we quote is never the flattering one. */
export const MODEL_DOWNLOAD_LABEL = "about 1.6 GB";

const DESKTOP_MODEL_WASM = "/model/Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm";

type DesktopBridge = {
  isDesktop?: boolean;
  modelBasePath?: string;
  modelWasmPath?: string;
};

declare global {
  interface Window {
    goodlifeDesktop?: DesktopBridge;
  }
}

export type ModelStatus = "off" | "loading" | "ready" | "error" | "unsupported";

type Delta = { choices?: { delta?: { content?: string }; message?: { content?: string } }[] };
type Engine = {
  chat: {
    completions: {
      create: (args: {
        messages: { role: string; content: string }[];
        temperature?: number;
        max_tokens?: number;
        stream?: boolean;
      }) => Promise<AsyncIterable<Delta> & Delta>;
    };
  };
  unload?: () => Promise<void>;
  /** WebLLM's cooperative cancel. It ends the current stream rather than
   *  throwing, so the partial text stays usable. */
  interruptGenerate?: () => void;
};

let engine: Engine | null = null;

export function webgpuSupported() {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

function desktopAppConfig(webllm: typeof import("@mlc-ai/web-llm")) {
  if (typeof window === "undefined" || !window.goodlifeDesktop?.isDesktop) return undefined;
  // Electron serves the same React app from a fixed localhost origin. Only
  // the model record changes: its weights and wasm are installer resources,
  // while the web build keeps WebLLM's maintained remote defaults.
  const modelBasePath = new URL(window.goodlifeDesktop.modelBasePath ?? "/model/resolve/main/", window.location.origin).href;
  const modelWasmPath = new URL(window.goodlifeDesktop.modelWasmPath ?? DESKTOP_MODEL_WASM, window.location.origin).href;
  return {
    ...webllm.prebuiltAppConfig,
    model_list: [{
      model: modelBasePath,
      model_id: MODEL_ID,
      model_lib: modelWasmPath,
      low_resource_required: true,
      vram_required_MB: 1629.75,
      overrides: { context_window_size: 4096 },
    }],
  };
}

export function isLoaded() {
  return engine !== null;
}

/** Downloads once per browser profile and stays in the browser's cache, so a
 *  second call is fast. `onProgress` gets 0 to 1. */
export async function loadModel(onProgress: (fraction: number, text: string) => void) {
  if (engine) return engine;
  const webllm = await import("@mlc-ai/web-llm");
  const created = await webllm.CreateMLCEngine(MODEL_ID, {
    appConfig: desktopAppConfig(webllm),
    initProgressCallback: (report) => onProgress(report.progress ?? 0, report.text || "Getting the model ready"),
  });
  engine = created as unknown as Engine;
  return engine;
}

/** Frees the GPU and the memory. The downloaded weights stay in the browser's
 *  cache storage, which `deleteModelCache` is for. */
export async function unloadModel() {
  try {
    await engine?.unload?.();
  } catch {
    // The engine is being thrown away either way.
  }
  engine = null;
}

/** Actually reclaims the disk space. WebLLM keeps its weights in
 *  Cache Storage under its own buckets, so this drops every cache it owns. */
export async function deleteModelCache() {
  await unloadModel();
  if (typeof caches === "undefined") return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => /webllm|mlc/i.test(key)).map((key) => caches.delete(key)));
  } catch {
    // Nothing else to try. The status text tells the truth either way.
  }
}

/** Asks the model which playbook topic fits. A handful of tokens at
 *  temperature 0, so it costs far less than the answer that follows. Falls back
 *  to `general` if the model is off, refuses, or says something unrecognisable,
 *  which only ever means broader notes, never no notes.
 *
 *  This is now the only thing that recognises a crisis message. There is no
 *  phrase list underneath it, which is a deliberate choice, and it means the
 *  coach cannot recognise one at all until the model has finished downloading.
 *  The caller gates on that. */
export async function chooseTopic(message: string): Promise<Topic> {
  if (!engine) return fallbackTopic(PLAYBOOK);

  const fence = makeFence();
  try {
    const response = await engine.chat.completions.create({
      messages: [
        { role: "system", content: buildTopicSystemPrompt(topicMenu(PLAYBOOK)) },
        { role: "user", content: buildTopicUserPrompt(message, fence) },
      ],
      temperature: 0,
      max_tokens: 8,
      stream: false,
    });
    const raw = response.choices?.[0]?.message?.content ?? "";
    // A leaking topic pass means the message steered it, so take the fallback.
    if (looksLikeLeak(raw, fence)) return fallbackTopic(PLAYBOOK);
    return readTopicChoice(PLAYBOOK, raw);
  } catch {
    return fallbackTopic(PLAYBOOK);
  }
}

/** Ends the current generation. The stream closes normally, so whatever the
 *  model had already written is kept rather than thrown away. */
export function stopGeneration() {
  engine?.interruptGenerate?.();
}

export type StreamRequest = { goodDay: string; message: string; notes: string[]; history?: Turn[] };

/** Why a reply never made it to the thread. `blocked` means we threw away a
 *  finished thought on purpose; `failed` means there was nothing worth showing.
 *  The two read differently to the person, so they stay apart. */
export type StreamResult = { ok: true; text: string } | { ok: false; reason: "blocked" | "failed" };

/** Streams a reply token by token. `null` only when the model isn't loaded,
 *  which the caller already checks for. Everything else comes back as a result
 *  the thread can explain. */
export async function streamReply(
  request: StreamRequest,
  onToken: (partial: string) => void,
): Promise<StreamResult | null> {
  if (!engine) return null;
  const fence = makeFence();
  const stream = await engine.chat.completions.create({
    messages: [
      { role: "system", content: buildSystemPrompt({ goodDay: request.goodDay, notes: request.notes }, fence) },
      ...buildHistoryMessages(request.history ?? [], fence),
      { role: "user", content: buildUserPrompt(request.message, fence) },
    ],
    temperature: 0.4,
    // Room for a short list to actually finish. The voice is what keeps replies
    // brief; this is only here so a reply is never cut off mid-word.
    max_tokens: 400,
    stream: true,
  });

  let text = "";
  for await (const chunk of stream) {
    const token = chunk.choices?.[0]?.delta?.content;
    if (!token) continue;
    text += token;
    // Both checks run mid-stream, so neither a leak nor a prescription is ever
    // on screen, not even for the second before the stream ends.
    if (looksLikeLeak(text, fence)) return { ok: false, reason: "failed" };
    if (prescribesMedication(text)) return { ok: false, reason: "blocked" };
    onToken(normalizeCoachText(text));
  }

  const finished = normalizeCoachText(text).trim();
  return finished.length ? { ok: true, text: finished } : { ok: false, reason: "failed" };
}
