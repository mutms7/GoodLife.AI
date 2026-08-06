import { normalizeCoachText } from "@/lib/advice";

export const MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
export const MODEL_LABEL = "Qwen 0.5B";

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

export async function unloadModel() {
  try {
    await engine?.unload?.();
  } catch {
    // The engine is being thrown away either way.
  }
  engine = null;
}

function systemPrompt(goodDay: string) {
  const anchor = goodDay.trim() ? `Here is how they described a good day: "${goodDay.trim()}". Point back to it when it helps.` : "They haven't described a good day yet.";
  return `You are a calm, practical life coach talking to one person. ${anchor} Write plain, first-person, conversational English with contractions. Two to four sentences. Never use em dashes, exclamation marks, canned praise, slogans, or a closing summary. Suggest one small thing they could actually do today. Never give medical, legal or financial advice.`;
}

/** Streams a reply token by token. Returns the finished text, or null if the
 *  model produced nothing usable so the caller can fall back. */
export async function streamReply(goodDay: string, message: string, onToken: (partial: string) => void) {
  if (!engine) return null;
  const stream = await engine.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt(goodDay) },
      { role: "user", content: message },
    ],
    temperature: 0.4,
    max_tokens: 220,
    stream: true,
  });
  let text = "";
  for await (const chunk of stream) {
    const token = chunk.choices?.[0]?.delta?.content;
    if (!token) continue;
    text += token;
    onToken(normalizeCoachText(text));
  }
  const finished = normalizeCoachText(text).trim();
  return finished.length ? finished : null;
}
