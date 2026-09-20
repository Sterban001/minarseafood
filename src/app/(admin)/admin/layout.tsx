import type { Metadata } from "next";

import { restaurant } from "@/shared/config/restaurant";

export const metadata: Metadata = {
  title: {
    default: `${restaurant.name} · Staff`,
    template: `%s · ${restaurant.name} Staff`,
  },
  robots: { index: false, follow: false },
};

/**
 * Wrapper for everything under /admin. Deliberately holds no navigation and no
 * session logic: the login and no-access screens sit directly under it, while
 * the gated panel lives in the `(app)` group below.
 */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-full flex-col bg-slate-100">{children}</div>;
}
