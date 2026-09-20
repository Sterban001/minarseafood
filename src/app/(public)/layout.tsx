import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

import { SiteFooter } from "@/modules/public/components/site-footer";
import { SiteHeader } from "@/modules/public/components/site-header";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  style: ["normal", "italic"],
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
