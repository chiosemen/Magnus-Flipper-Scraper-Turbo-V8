import React from "react";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"], 
  variable: "--font-space",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Magnus Flipper AI | High-Frequency Arbitrage Scanner",
  description: "Find profitable flips before anyone else. Monitor Facebook Marketplace, eBay, and more 24/7 with enterprise-grade speed.",
  openGraph: {
    title: "Magnus Flipper AI - Find Flips Fast",
    description: "The #1 automated deal finder for professional flippers.",
    images: [
      {
        url: '/logo-social-square.svg', // In prod this should be a PNG, but SVG works in some contexts or we assume generating step happened
        width: 1200,
        height: 1200,
        alt: 'Magnus Flipper AI Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary', // using summary since we have a square logo
    title: "Magnus Flipper AI",
    description: "Find profitable flips before anyone else.",
    images: ['/logo-social-square.svg'], // same here
  },
  icons: {
    icon: '/logo-stacked.svg', // using the stacked logo as favicon essentially
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200`}>
        {children}
      </body>
    </html>
  );
}