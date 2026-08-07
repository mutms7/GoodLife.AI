import { normalizeCoachText } from "@/lib/advice";
import { PLAYBOOK } from "@/lib/coach-playbook";
import { fallbackTopic, matchSafetyNet, readTopicChoice, topicMenu, type Topic } from "@/lib/playbook";
import { buildSystemPrompt, buildTopicSystemPrompt, buildTopicUserPrompt, buildUserPrompt, looksLikeLeak, makeFence } from "@/lib/prompt";

export const MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
export const MODEL_LABEL = "Qwen 0.5B";
/** Rounded, and stated everywhere we ask someone to start the download. */
export const MODEL_DOWNLOAD_LABEL = "about 1 GB";

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
};

let engine: Engine | null = null;

export function webgpuSupported() {
  return typeof navigator !== "undefined" && "gpu" in navigator;
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

/** Actually reclaims the roughly 1 GB on disk. WebLLM keeps its weights in
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

/** The literal-phrase floor. Runs with no model and no network, so it also
 *  works before the download finishes. */
export function safetyNetTopic(message: string): Topic | undefined {
  return matchSafetyNet(PLAYBOOK, message);
}

/** Asks the model which playbook topic fits. A handful of tokens at
 *  temperature 0, so it costs far less than the answer that follows. Falls back
 *  to `general` if the model is off, refuses, or says something unrecognisable,
 *  which only ever means broader notes, never no notes. */
export async function chooseTopic(message: string): Promise<Topic> {
  const net = safetyNetTopic(message);
  if (net) return net;
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

export type StreamRequest = { goodDay: string; message: string; notes: string[] };

/** Streams a reply token by token. Returns the finished text, or null when the
 *  model produced nothing usable or echoed the prompt scaffolding back, so the
 *  caller can show a retry instead of the leak. */
export async function streamReply(request: StreamRequest, onToken: (partial: string) => void) {
  if (!engine) return null;
  const fence = makeFence();
  const stream = await engine.chat.completions.create({
    messages: [
      { role: "system", content: buildSystemPrompt({ goodDay: request.goodDay, notes: request.notes }, fence) },
      { role: "user", content: buildUserPrompt(request.message, fence) },
    ],
    temperature: 0.4,
    max_tokens: 220,
    stream: true,
  });

  let text = "";
  let leaked = false;
  for await (const chunk of stream) {
    const token = chunk.choices?.[0]?.delta?.content;
    if (!token) continue;
    text += token;
    // Checked mid-stream so a leaking reply never reaches the screen at all.
    if (looksLikeLeak(text, fence)) {
      leaked = true;
      break;
    }
    onToken(normalizeCoachText(text));
  }

  if (leaked) return null;
  const finished = normalizeCoachText(text).trim();
  return finished.length ? finished : null;
}
