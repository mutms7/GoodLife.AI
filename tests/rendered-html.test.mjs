import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the chat-first marketing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>GoodLife\.AI \| a coach for the life you&#x27;re actually living<\/title>/i);
  assert.match(html, /A coach for the life you(?:&#x27;|')re actually living/);
  assert.match(html, /See the shape of an answer/);
  assert.match(html, /Your answers never leave the browser you typed them into/);
  // The page has to say the download is required, not optional.
  assert.match(html, /You download the coach/);
  assert.match(html, /can(?:&#x27;|')t start until the download finishes/);
  assert.match(html, /manifest\.webmanifest/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton|codex-preview/i);
});

test("the old daily-tracker dashboard is gone", async () => {
  const html = await (await render()).text();
  assert.doesNotMatch(html, /THREE STARTS FOR TODAY|What should I call you|Browse the ideas/i);
  const [page, globals] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(page, /start-card|hero-spark|onboarding-card/);
  assert.doesNotMatch(globals, /--deep|--sage:|start-card/);
});

test("the product source keeps the local-first pieces", async () => {
  const [app, storage, llm, packageJson] = await Promise.all([
    readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/storage.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/llm.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(storage, /localStorage/);
  assert.match(app, /streamReply/);
  assert.match(llm, /@mlc-ai\/web-llm/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("the chat is gated on the model, with no fixed-guidance chat behind it", async () => {
  const [app, llm] = await Promise.all([
    readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/llm.ts", import.meta.url), "utf8"),
    ]);
  // The composer only renders once the model is ready; otherwise it's the gate.
  assert.match(app, /status === "ready"\s*\n?\s*\?\s*<Composer/);
  assert.match(app, /<ModelGate/);
  // The old bypass is gone: no reply path that answers without the model.
  assert.doesNotMatch(app, /coachReply|isModelSafe|guidanceFor/);
  // Every generation is grounded and fenced.
  assert.match(llm, /buildSystemPrompt/);
  assert.match(llm, /looksLikeLeak/);
  assert.match(llm, /notes: request\.notes/);
});

test("the topic comes from the model reading the playbook, not from keywords", async () => {
  const [app, llm, advice] = await Promise.all([
    readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/llm.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/advice.ts", import.meta.url), "utf8"),
  ]);
  // A model pass picks the topic before the answer is generated.
  assert.match(app, /await chooseTopic\(message\)/);
  assert.match(llm, /buildTopicSystemPrompt/);
  assert.match(llm, /topicMenu\(PLAYBOOK\)/);
  // The old keyword table is gone from the advice module entirely.
  assert.doesNotMatch(advice, /classifyMessage|PATTERNS|DOMAIN_NOTES|MUST_APPEND/);
  // And so is the crisis floor that used to sit under the model. Phrase
  // matching is gone from the whole reply path, crisis included, so nothing
  // reaches the fixed reply except the model naming the topic.
  assert.doesNotMatch(llm, /matchSafetyNet|safetyNetTopic/);
  assert.doesNotMatch(app, /matchSafetyNet|safetyNetTopic/);
  assert.match(app, /topic\.fixedReply/);
});
