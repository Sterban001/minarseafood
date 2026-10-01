import localFont from "next/font/local";

import { SiteFooter } from "@/modules/public/components/site-footer";
import { SiteHeader } from "@/modules/public/components/site-header";

const plusJakartaSans = localFont({
  src: "../../../public/fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  variable: "--font-jakarta",
  display: "swap",
  weight: "400 800",
});

const playfair = localFont({
  src: [
    {
      path: "../../../public/fonts/playfair-display-latin-wght-normal.woff2",
      style: "normal",
    },
    {
      path: "../../../public/fonts/playfair-display-latin-wght-italic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-playfair",
  display: "swap",
  weight: "600 900",
});

/** Chrome for the customer-facing site. Nothing here is shared with /admin. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      className={`${plusJakartaSans.variable} ${playfair.variable} public-site flex min-h-dvh flex-col`}
    >
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
