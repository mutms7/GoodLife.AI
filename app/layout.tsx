import type { Metadata } from "next";
import { headers } from "next/headers";
import { Caprasimo, Figtree } from "next/font/google";
import "./globals.css";

// Self-hosted so the installed shell still draws its own type offline.
const caprasimo = Caprasimo({ variable: "--font-caprasimo", subsets: ["latin"], weight: "400", display: "swap" });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

const TITLE = "GoodLife.AI | a coach for the life you're actually living";
const DESCRIPTION = "Answer a few honest questions and get three small steps for today. It runs in your browser, with no account and nothing sent to a server.";

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
    // The variables go on <html> so :root can compose --font-heading from them.
    <html lang="en" className={`${caprasimo.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  );
}
