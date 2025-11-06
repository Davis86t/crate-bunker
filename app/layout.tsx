// app/layout.tsx
// Purpose: Root layout wrapper for the Next.js app router.
// Notes: Global fonts & CSS, top-level Banner (in Suspense) and SW register.

import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Banner from "@/components/Banner";
import { Suspense } from "react";

// Fonts (loaded once; exposed via CSS variables)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata: head defaults for the entire app
export const metadata: Metadata = {
  title: "Crate Bunker",
  description: "Built. Secured. Deployed.",
};

// Root layout: wraps every route
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Banner reads URL flags; wrapped in Suspense to tolerate server/URL timing */}
        <Suspense fallback={null}>
          <Banner />
        </Suspense>

        {/* Register SW and warm up static assets (client-only, no UI) */}
        <ServiceWorkerRegister />

        {/* Route content */}
        {children}
      </body>
    </html>
  );
}
