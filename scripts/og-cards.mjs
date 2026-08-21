// The two Open Graph share cards, as markup.
//
// A link preview gets rendered at about 160px wide, so a scaled-down screenshot
// of the marketing hero collapses into mush. These cards are drawn for that
// size instead: three elements, one of them very large. Every value here comes
// from the design handoff and the colours are read out of app/globals.css so
// the card can never drift from the design system.
import { readFile } from "node:fs/promises";

const GLOBALS = new URL("../app/globals.css", import.meta.url);

const FONTS = {
  Caprasimo: new URL("../node_modules/@fontsource/caprasimo/files/caprasimo-latin-400-normal.woff2", import.meta.url),
  Figtree: new URL("../node_modules/@fontsource/figtree/files/figtree-latin-400-normal.woff2", import.meta.url),
};

const TOKENS = [
  "color-accent-2-900", // card background
  "color-accent-2-800", // dandelion decoration
  "color-accent-2-400", // lockup circle fill
  "color-accent-2-300", // supporting line
  "color-accent-400", // the ".ai"
  "color-neutral-100", // wordmark, headline
];

export const HEADLINE = "A coach for the life you're actually living.";
export const SUBHEAD = "Runs on your device. No account.";
export const ALT = "goodlife.ai — a coach for the life you're actually living.";

/** 1200 x 630 goes first: most platforms take the first og:image. The square is
 *  for iMessage, WhatsApp and the Android share sheets that crop to 1:1. */
export const CARDS = [
  {
    name: "og-1200x630.v2.png",
    width: 1200,
    height: 630,
    padding: "64px 72px",
    deco: { size: 640, right: -130, bottom: -190 },
    lockup: { circle: 76, mark: 48, gap: 20, wordmark: 46 },
    headline: { maxWidth: 940, gap: 26, size: 96, sub: 34 },
  },
  {
    name: "og-600x600.v2.png",
    width: 600,
    height: 600,
    padding: "52px 54px",
    deco: { size: 420, right: -90, bottom: -140 },
    lockup: { circle: 62, mark: 40, gap: 16, wordmark: 38 },
    headline: { maxWidth: 490, gap: 20, size: 74, sub: 27 },
  },
];

// The brand mark, same geometry as the Dandelion in components/marks.tsx. The
// seed radius is explicit here because the card wants 1.1 on the big decoration
// where the component's stroke-derived radius would give 1.0.
const RAY_TIPS = [[19.2, 11], [17.4, 5.8], [12, 4], [6.6, 5.8], [4.8, 11]];

function dandelion({ size, strokeWidth, seedRadius }) {
  const rays = RAY_TIPS.map(([x, y]) => `<path d="M12 12 ${x} ${y}"/>`).join("");
  const seeds = RAY_TIPS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${seedRadius}" fill="currentColor" stroke="none"/>`).join("");
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"><path d="M12 12c0 4 -0.8 7 -1 10"/>${rays}${seeds}</svg>`;
}

async function readTokens() {
  const css = await readFile(GLOBALS, "utf8");
  return Object.fromEntries(TOKENS.map((token) => {
    const marker = `--${token}:`;
    const at = css.indexOf(marker);
    if (at < 0) throw new Error(`app/globals.css no longer defines ${marker.slice(0, -1)}`);
    const value = css.slice(at + marker.length).split(";")[0].trim();
    if (!value.startsWith("#")) throw new Error(`${marker.slice(0, -1)} is "${value}", the card needs a hex colour it can inline`);
    return [token, value];
  }));
}

// Fonts are embedded, not linked. A card that silently falls back to a system
// serif is the failure mode to watch for, and it fails silently.
async function readFontFaces() {
  const faces = await Promise.all(Object.entries(FONTS).map(async ([family, url]) => {
    const data = (await readFile(url)).toString("base64");
    return `@font-face{font-family:"${family}";font-weight:400;font-style:normal;src:url(data:font/woff2;base64,${data}) format("woff2")}`;
  }));
  return faces.join("");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Full standalone document for one card, sized to exactly the card. */
export async function cardHtml(card) {
  const [c, fontFaces] = await Promise.all([readTokens(), readFontFaces()]);
  const { deco, lockup, headline } = card;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(ALT)}</title><style>
${fontFaces}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${card.width}px;height:${card.height}px;background:${c["color-accent-2-900"]};overflow:hidden}
.card{width:${card.width}px;height:${card.height}px;position:relative;overflow:hidden;padding:${card.padding};background:${c["color-accent-2-900"]};color:${c["color-neutral-100"]};font-family:"Figtree",system-ui,sans-serif;display:flex;flex-direction:column;justify-content:space-between;-webkit-font-smoothing:antialiased}
.deco{position:absolute;right:${deco.right}px;bottom:${deco.bottom}px;width:${deco.size}px;height:${deco.size}px;color:${c["color-accent-2-800"]};opacity:0.9}
.lockup{position:relative;display:flex;align-items:center;gap:${lockup.gap}px}
.badge{width:${lockup.circle}px;height:${lockup.circle}px;flex:none;border-radius:999px;background:${c["color-accent-2-400"]};color:${c["color-accent-2-900"]};display:grid;place-items:center}
.wordmark{font-family:"Caprasimo",Georgia,serif;font-size:${lockup.wordmark}px;letter-spacing:-0.01em}
.wordmark span{color:${c["color-accent-400"]}}
.copy{position:relative;display:flex;flex-direction:column;gap:${headline.gap}px;max-width:${headline.maxWidth}px}
h1{font-family:"Caprasimo",Georgia,serif;font-weight:400;font-size:${headline.size}px;line-height:1.02;letter-spacing:-0.02em;color:${c["color-neutral-100"]};text-wrap:balance}
.sub{font-size:${headline.sub}px;color:${c["color-accent-2-300"]}}
</style></head>
<body><div class="card">
<div class="deco">${dandelion({ size: deco.size, strokeWidth: 0.9, seedRadius: 1.1 })}</div>
<div class="lockup"><div class="badge">${dandelion({ size: lockup.mark, strokeWidth: 1.5, seedRadius: 1.6 })}</div><div class="wordmark">goodlife<span>.ai</span></div></div>
<div class="copy"><h1>${escapeHtml(HEADLINE)}</h1><div class="sub">${escapeHtml(SUBHEAD)}</div></div>
</div></body></html>`;
}
