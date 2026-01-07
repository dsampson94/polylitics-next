import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "POLYLITICS // Market Intelligence",
    template: "%s | POLYLITICS"
  },
  description: "Dark analytics terminal for Polymarket prediction markets. Real-time market intelligence, opportunity scanning, and advanced statistical analysis for prediction market traders.",
  keywords: ["polymarket", "prediction markets", "market intelligence", "trading terminal", "analytics", "blockchain", "crypto betting", "market analysis"],
  authors: [{ name: "Polylitics" }],
  creator: "Polylitics",
  publisher: "Polylitics",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "POLYLITICS // Market Intelligence",
    description: "Dark analytics terminal for Polymarket prediction markets. Real-time market intelligence, opportunity scanning, and advanced statistical analysis.",
    siteName: "POLYLITICS",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "POLYLITICS - Market Intelligence Terminal"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "POLYLITICS // Market Intelligence",
    description: "Dark analytics terminal for Polymarket prediction markets",
    images: ["/og-image.png"],
    creator: "@polylitics"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg" }
    ]
  },
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${jetbrainsMono.variable} antialiased bg-[#0d0d0f] text-[#e8e8e8] font-mono`}>
        {children}
      </body>
    </html>
  );
}
