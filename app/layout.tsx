import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource/caprasimo/latin-400.css";
import "@fontsource/figtree/latin-400.css";
import "@fontsource/figtree/latin-600.css";
import "@fontsource/figtree/latin-700.css";
import "./globals.css";

const TITLE = "GoodLife.AI | a coach for the life you're actually living";
const DESCRIPTION = "A private AI coach that runs locally on your computer or phone, with optional account sync and seven-day conversation deletion.";

// The share card already carries the headline, so the og:title stays short and
// the description does the explaining. The cards themselves are drawn for the
// ~160px a link preview actually gets; see scripts/og-cards.mjs.
const SHARE_TITLE = "GoodLife.AI";
const SHARE_DESCRIPTION = "Answer a few honest questions and get three small steps. Runs on your device, no account.";
const SHARE_ALT = "goodlife.ai — a coach for the life you're actually living.";
// Versioned filenames, because Twitter, Slack, iMessage and LinkedIn all cache
// these hard. Replacing a card means shipping a new .vN name rather than
// overwriting one, or you spend days staring at the old preview.
const SHARE_WIDE = "/og-1200x630.v2.png";
const SHARE_SQUARE = "/og-600x600.v2.png";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const localHost = host?.startsWith("localhost") || host?.startsWith("127.0.0.1");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (localHost ? "http" : "https");
  const base = host ? new URL(`${protocol}://${host}`) : new URL("https://goodlife.local");
  // Absolute URLs: crawlers do not resolve relative ones.
  const wide = new URL(SHARE_WIDE, base).toString();
  const square = new URL(SHARE_SQUARE, base).toString();
  return {
    metadataBase: base,
    title: TITLE,
    description: DESCRIPTION,
    icons: {
      icon: [
        { url: "/favicon.svg?v=2", type: "image/svg+xml" },
        { url: "/favicon.ico?v=2", type: "image/x-icon", sizes: "any" },
      ],
      shortcut: "/favicon.ico?v=2",
      apple: "/icon-192.png?v=2",
    },
    manifest: "/manifest.webmanifest",
    themeColor: "#f5ead8",
    openGraph: {
      title: SHARE_TITLE,
      description: SHARE_DESCRIPTION,
      type: "website",
      // The 1200 x 630 goes first: most platforms take the first og:image. The
      // square is there for the ones that crop to 1:1 (iMessage, WhatsApp,
      // some Android share sheets).
      images: [
        { url: wide, width: 1200, height: 630, alt: SHARE_ALT },
        { url: square, width: 600, height: 600, alt: SHARE_ALT },
      ],
    },
    twitter: { card: "summary_large_image", title: SHARE_TITLE, description: SHARE_DESCRIPTION, images: [{ url: wide, alt: SHARE_ALT }] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
