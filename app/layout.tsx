import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const base = host ? new URL(`${protocol}://${host}`) : new URL("https://goodlife.local");
  const image = new URL("/og.png", base).toString();
  return {
    metadataBase: base,
    title: "GoodLife — small steps toward a life that fits",
    description: "A private, local-first life guide for your next good step.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    manifest: "/manifest.webmanifest",
    themeColor: "#285547",
    openGraph: { title: "GoodLife — small steps toward a life that fits", description: "A private, local-first life guide for your next good step.", type: "website", images: [{ url: image, width: 1200, height: 630, alt: "GoodLife — small steps toward a life that fits" }] },
    twitter: { card: "summary_large_image", title: "GoodLife — small steps toward a life that fits", description: "A private, local-first life guide for your next good step.", images: [image] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
