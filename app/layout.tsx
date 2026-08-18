import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource/caprasimo/latin-400.css";
import "@fontsource/figtree/latin-400.css";
import "@fontsource/figtree/latin-600.css";
import "@fontsource/figtree/latin-700.css";
import "./globals.css";

const TITLE = "GoodLife.AI | a coach for the life you're actually living";
const DESCRIPTION = "A private AI coach that runs locally on your computer or phone, with optional account sync and seven-day conversation deletion.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const localHost = host?.startsWith("localhost") || host?.startsWith("127.0.0.1");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (localHost ? "http" : "https");
  const base = host ? new URL(`${protocol}://${host}`) : new URL("https://goodlife.local");
  const image = new URL("/og.png", base).toString();
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
    openGraph: { title: TITLE, description: DESCRIPTION, type: "website", images: [{ url: image, width: 1200, height: 630, alt: TITLE }] },
    twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
