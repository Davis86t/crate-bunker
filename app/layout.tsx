// app/layout.tsx
// Purpose: Global HTML shell. Injects Banner + SW registration.
// Notes: Keep <body> lightweight; Banner uses fixed positioning.

import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Banner from "@/components/Banner";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crate Bunker™ | Built. Secured. Deployed.",
  description:
    "Crate Bunker designs, builds, and maintains digital infrastructure that never cracks under pressure. Dependable web systems built to last.",
  metadataBase: new URL("https://cratebunker.com"),
  manifest: "/manifest.json", // 👈 this line adds the manifest link automatically
  openGraph: {
    title: "Crate Bunker™ | Built. Secured. Deployed.",
    description:
      "Dependable web systems built to last — design, build, and maintenance by Crate Bunker.",
    url: "https://cratebunker.com",
    siteName: "Crate Bunker",
    images: [
      {
        url: "/crate-bunker-og-image.png",
        width: 1200,
        height: 630,
        alt: "Crate Bunker branding",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crate Bunker™ | Built. Secured. Deployed.",
    description: "Dependable web systems built to last.",
    images: ["/crate-bunker-og-image.png"],
  },
  icons: {
    icon: [
      { url: "/app-icon-1024.png", sizes: "32x32", type: "image/png" },
      { url: "/app-icon-1024.png", sizes: "16x16", type: "image/png" },
    ],
    apple: ["/app-icon-1024.png"],
    other: [{ rel: "icon", url: "/app-icon-1024.png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`h-full ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh bg-[#0E0E0E] text-white antialiased">
        <Banner />
        <ServiceWorkerRegister />
        <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
