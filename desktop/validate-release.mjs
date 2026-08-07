import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = path.join(root, "release");
const installer = path.join(release, "GoodLife.AI-Setup.exe");
const blockmap = `${installer}.blockmap`;
const metadata = path.join(release, "latest.yml");
const unpacked = path.join(release, "win-unpacked");
const executable = path.join(unpacked, "GoodLife.AI.exe");
const model = path.join(unpacked, "resources", "model");
const appArchive = path.join(unpacked, "resources", "app.asar");

for (const filename of [installer, blockmap, metadata, executable, appArchive, path.join(model, "manifest.json")]) {
  if (!existsSync(filename)) throw new Error(`Release is missing ${path.relative(root, filename)}`);
}
if (statSync(installer).size < 500_000_000) throw new Error("Installer is too small to contain the offline model");
if (statSync(appArchive).size > 500_000_000) throw new Error("App archive is unexpectedly large; the model may have been packaged twice");

const latest = readFileSync(metadata, "utf8");
if (!latest.includes("GoodLife.AI-Setup.exe") || !/^version: 1\.0\.\d+$/m.test(latest)) {
  throw new Error("latest.yml does not describe the expected stable installer");
}

const manifest = JSON.parse(readFileSync(path.join(model, "manifest.json"), "utf8"));
if (manifest.revision !== "9bd564b064631febf14deadcac492efb761d60c3" || Object.keys(manifest.files ?? {}).length !== 39) {
  throw new Error("Packaged model manifest is incomplete or unpinned");
}
for (const [name, expected] of Object.entries(manifest.files)) {
  const filename = path.join(model, name);
  if (!existsSync(filename) || statSync(filename).size !== expected.size) throw new Error(`Packaged model file is invalid: ${name}`);
  const digest = createHash("sha256").update(readFileSync(filename)).digest("hex");
  if (digest !== expected.sha256) throw new Error(`Packaged model checksum failed: ${name}`);
}

const smoke = spawnSync(executable, ["--smoke-test"], { stdio: "inherit", timeout: 60_000, windowsHide: true });
if (smoke.error || smoke.status !== 0) throw smoke.error ?? new Error(`Packaged app smoke test exited ${smoke.status}`);
console.log("Installer, updater metadata, offline model, and packaged app smoke test passed");
