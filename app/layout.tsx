import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: 'Crate Bunker™ | Built. Secured. Deployed.',
  description:
    'Crate Bunker designs, builds, and maintains digital infrastructure that never cracks under pressure. Dependable web systems built to last.',
  metadataBase: new URL('https://cratebunker.com'),
  manifest: '/manifest.json', // 👈 this line adds the manifest link automatically
  openGraph: {
    title: 'Crate Bunker™ | Built. Secured. Deployed.',
    description:
      'Dependable web systems built to last — design, build, and maintenance by Crate Bunker.',
    url: 'https://cratebunker.com',
    siteName: 'Crate Bunker',
    images: [
      {
        url: '/crate-bunker-og-image.png',
        width: 1200,
        height: 630,
        alt: 'Crate Bunker branding',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crate Bunker™ | Built. Secured. Deployed.',
    description: 'Dependable web systems built to last.',
    images: ['/crate-bunker-og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-32.png?v=7', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png?v=7', sizes: '16x16', type: 'image/png' },
    ],
    apple: ['/icon-192.png'],
    other: [{ rel: 'icon', url: '/icon-512.png' }],
  },
};

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
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
