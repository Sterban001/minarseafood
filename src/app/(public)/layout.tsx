import { Cormorant_Garamond, Outfit } from "next/font/google";

import { SiteFooter } from "@/modules/public/components/site-footer";
import { SiteHeader } from "@/modules/public/components/site-header";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

/** Chrome for the customer-facing site. Nothing here is shared with /admin. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      className={`${outfit.variable} ${cormorant.variable} public-site flex min-h-dvh flex-col`}
    >
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
