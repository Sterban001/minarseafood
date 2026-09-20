import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";

import { restaurant } from "@/shared/config/restaurant";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: `${restaurant.displayName} — Seafood Restaurant`,
    template: `%s · ${restaurant.name}`,
  },
  description: restaurant.description,
  icons: {
    icon: [{ url: restaurant.logo, type: "image/png" }],
    apple: restaurant.logo,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#204f56",
};

/**
 * Only owns the document shell. The public site and the admin panel each bring
 * their own chrome from `src/app/(public)/layout.tsx` and
 * `src/app/(admin)/admin/layout.tsx`.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
