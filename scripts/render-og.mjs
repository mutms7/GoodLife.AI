// Renders the Open Graph share cards to PNG at 2x. Run with:
//
//   npm run og:render
//
// The cards never change per page, so they are rendered once here, committed to
// public/ and served as static files. No runtime image generation, no extra
// dependency: this drives whatever Chromium is already on the machine, which is
// also the engine the cards were designed against (Caprasimo metrics,
// text-wrap: balance). Set CHROME_PATH to point at a specific binary.
import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CARDS, cardHtml } from "./og-cards.mjs";

const SCALE = 2;
const OUT_DIR = new URL("../public/", import.meta.url);

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  `${process.env.LOCALAPPDATA ?? ""}/Google/Chrome/Application/chrome.exe`,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

async function findChromium() {
  for (const candidate of CANDIDATES) {
    try {
      await access(candidate);
      return candidate;
    } catch {}
  }
  throw new Error(`No Chromium found. Set CHROME_PATH. Looked in:\n  ${CANDIDATES.join("\n  ")}`);
}

function run(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${binary} exited ${code}\n${stderr}`))));
  });
}

/** Width and height out of the PNG's IHDR chunk, which always comes first. */
function pngSize(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function render(card, binary, workDir) {
  const htmlPath = join(workDir, `${card.name}.html`);
  const shotPath = join(workDir, card.name);
  await writeFile(htmlPath, await cardHtml(card), "utf8");

  await run(binary, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    // Forces 2x regardless of the display this runs on, so the PNGs come out
    // the same size on anyone's machine.
    `--force-device-scale-factor=${SCALE}`,
    `--window-size=${card.width},${card.height}`,
    // Long enough for the embedded woff2 faces to decode. Without it the card
    // can screenshot mid-swap and ship with a fallback serif.
    "--virtual-time-budget=4000",
    `--user-data-dir=${join(workDir, "profile")}`,
    "--no-first-run",
    "--no-default-browser-check",
    `--screenshot=${shotPath}`,
    htmlPath,
  ]);

  const png = await readFile(shotPath);
  const size = pngSize(png);
  const want = { width: card.width * SCALE, height: card.height * SCALE };
  if (size.width !== want.width || size.height !== want.height) {
    throw new Error(`${card.name}: rendered ${size.width}x${size.height}, expected ${want.width}x${want.height}`);
  }
  await writeFile(new URL(card.name, OUT_DIR), png);
  return `public/${card.name}  ${size.width}x${size.height}  ${(png.length / 1024).toFixed(0)} KB`;
}

const binary = await findChromium();
const workDir = await mkdtemp(join(tmpdir(), "goodlife-og-"));
try {
  for (const card of CARDS) console.log(await render(card, binary, workDir));
} finally {
  await rm(workDir, { recursive: true, force: true });
}
