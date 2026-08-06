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
  assert.match(html, /Try the coach right here/);
  assert.match(html, /Your answers never leave the browser you typed them into/);
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
  assert.match(app, /coachReply/);
  assert.match(app, /streamReply/);
  assert.match(llm, /@mlc-ai\/web-llm/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
