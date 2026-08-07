import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { releaseVersion } from "../desktop/version.mjs";
import { safeFile } from "../desktop/server.mjs";
import { DEFAULT_PORT, portCandidates } from "../desktop/ports.mjs";

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
