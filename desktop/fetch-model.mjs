import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MODEL_REVISION = "9bd564b064631febf14deadcac492efb761d60c3";
export const MODEL_REPOSITORY = "mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
export const WASM_REVISION = "025bcaf3780fa8254f5e5efd3bfea0a5397248f4";
export const WASM_SHA256 = "0fceb50bbaf47efdc31fce96b72c115dcb7f5221c85abe6a9fc02dda9d1d6fc3";
export const WASM_URL = `https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/${WASM_REVISION}/web-llm-models/v0_2_84/base/Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm`;
export const LICENSE_REVISION = "989aa7980e4cf806f80c7fef2b1adb7bc71aa306";
export const LICENSE_SHA256 = "832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e";
export const LICENSE_URL = `https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct/resolve/${LICENSE_REVISION}/LICENSE`;

// Keep this list explicit and sorted. Hugging Face's API may gain files that
// are useful for training or documentation but must not silently enter an
// installer. The 30 shards are the complete q4f16_1 runtime.
export const MODEL_FILES = [
  "merges.txt",
  "mlc-chat-config.json",
  "ndarray-cache.json",
  ...Array.from({ length: 30 }, (_, index) => `params_shard_${index}.bin`),
  "tensor-cache.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "vocab.json",
];

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const modelDirectory = path.join(scriptRoot, "desktop", "model");
const manifestPath = path.join(modelDirectory, "manifest.json");
const wasmFilename = path.basename(new URL(WASM_URL).pathname);

async function sha256(filename) {
  const hash = createHash("sha256");
  const stream = (await import("node:fs")).createReadStream(filename);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}

async function isComplete(entry) {
  try {
    const info = await stat(path.join(modelDirectory, entry.name));
    return info.isFile() && info.size === entry.size && (await sha256(path.join(modelDirectory, entry.name))) === entry.sha256;
  } catch {
    return false;
  }
}

async function download(url, name, expectedSha256) {
  const destination = path.join(modelDirectory, name);
  const partial = `${destination}.part`;
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) throw new Error(`Could not download ${url} (${response.status})`);
  await rm(partial, { force: true });
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
  await rename(partial, destination);
  const info = await stat(destination);
  const digest = await sha256(destination);
  if (expectedSha256 && digest !== expectedSha256) {
    throw new Error(`Integrity check failed for ${name}: expected ${expectedSha256}, received ${digest}`);
  }
  return { name, size: info.size, sha256: digest, url };
}

await mkdir(modelDirectory, { recursive: true });
let prior = null;
try { prior = JSON.parse(await readFile(manifestPath, "utf8")); } catch { /* first download */ }

const entries = MODEL_FILES.map((name) => ({
  name,
  url: `https://huggingface.co/${MODEL_REPOSITORY}/resolve/${MODEL_REVISION}/${name}?download=true`,
}));
entries.push({ name: wasmFilename, url: WASM_URL, expectedSha256: WASM_SHA256 });
entries.push({ name: "QWEN_LICENSE.txt", url: LICENSE_URL, expectedSha256: LICENSE_SHA256 });

const complete = [];
for (const entry of entries) {
  const known = prior?.revision === MODEL_REVISION && prior?.files?.[entry.name];
  const candidate = known ? { ...entry, ...prior.files[entry.name] } : null;
  const integrityMatches = !entry.expectedSha256 || candidate?.sha256 === entry.expectedSha256;
  const result = candidate && integrityMatches && await isComplete(candidate)
    ? candidate
    : await download(entry.url, entry.name, entry.expectedSha256);
  complete.push(result);
  console.log(`${result.name}: ${result.size} bytes`);
}

await writeFile(manifestPath, `${JSON.stringify({ repository: MODEL_REPOSITORY, revision: MODEL_REVISION, wasmRevision: WASM_REVISION, licenseRevision: LICENSE_REVISION, wasm: wasmFilename, files: Object.fromEntries(complete.map((entry) => [entry.name, { size: entry.size, sha256: entry.sha256, url: entry.url }])) }, null, 2)}\n`);
console.log(`Model ready in ${modelDirectory}`);
