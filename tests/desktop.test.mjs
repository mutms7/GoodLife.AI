import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { releaseVersion } from "../desktop/version.mjs";
import { safeFile } from "../desktop/server.mjs";
import { DEFAULT_PORT, portCandidates } from "../desktop/ports.mjs";
import { readFile } from "node:fs/promises";

test("desktop release versions are valid semver and monotonic by run number", () => {
  assert.equal(releaseVersion(7), "1.0.7");
  assert.ok(releaseVersion(8).localeCompare(releaseVersion(7), undefined, { numeric: true }) > 0);
});

test("desktop release version rejects missing or unsafe run numbers", () => {
  for (const value of [undefined, "", "1.5", 0, -1, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => releaseVersion(value), /GITHUB_RUN_NUMBER/);
  }
});

test("desktop asset paths cannot escape their packaged root", () => {
  const root = path.resolve("desktop", "model");
  assert.equal(safeFile(root, "/mlc-chat-config.json"), path.join(root, "mlc-chat-config.json"));
  assert.equal(safeFile(root, "/../package.json"), null);
  assert.equal(safeFile(root, "/%2e%2e/package.json"), null);
});

test("desktop server keeps a valid saved origin and has collision fallbacks", () => {
  assert.deepEqual(portCandidates(DEFAULT_PORT), [DEFAULT_PORT, 47824, 47825, 47826, 47827, 47828, 47829, 47830, 47831, 47832, 47833]);
  assert.equal(portCandidates(49152)[0], 49152);
  assert.equal(portCandidates("not-a-port")[0], DEFAULT_PORT);
});

test("desktop auth callbacks wait for the renderer and fonts have a web-safe MIME type", async () => {
  const [main, preload, server] = await Promise.all([
    readFile(new URL("../desktop/main.cjs", import.meta.url), "utf8"),
    readFile(new URL("../desktop/preload.cjs", import.meta.url), "utf8"),
    readFile(new URL("../desktop/server.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(main, /ipcMain\.on\("auth-renderer-ready"/);
  assert.match(main, /app\.isPackaged[\s\S]*desktop\/model/);
  assert.match(preload, /ipcRenderer\.send\("auth-renderer-ready"\)/);
  assert.match(server, /"\.woff2": "font\/woff2"/);
  assert.match(main, /Menu\.setApplicationMenu\(null\)/);
  assert.match(main, /before-input-event/);
  assert.match(main, /titleBarOverlay/);
  assert.match(preload, /fullscreen-toggle/);
  assert.match(preload, /fullscreen-changed/);
});

test("desktop auth returns through a connected browser page", async () => {
  const [supabase, bridge, gate] = await Promise.all([
    readFile(new URL("../lib/supabase.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/desktop/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/auth/auth-gate.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(supabase, /https:\/\/goodlifeai\.vercel\.app\/auth\/desktop/);
  assert.match(bridge, /goodlife:\/\/auth-callback/);
  assert.match(bridge, /"Connected"/);
  assert.match(gate, /Connected\. Starting GoodLife\.AI/);
});

test("desktop starts its bundled model without browser download copy", async () => {
  const [appPage, thread, screens] = await Promise.all([
    readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/app/thread.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/app/screens.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(appPage, /desktop \|\| saved\.modelOn/);
  assert.match(thread, /Starting the local SLM/);
  assert.match(thread, /Nothing is being downloaded from the internet/);
  assert.match(screens, /included with the Windows app/);
});
