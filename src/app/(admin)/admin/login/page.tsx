import type { Metadata } from "next";
import Link from "next/link";

import { GoogleButton } from "@/modules/admin/auth/google-button";
import { LoginForm } from "@/modules/admin/auth/login-form";
import { loginErrorMessage } from "@/modules/admin/auth/login-errors";
import { restaurant } from "@/shared/config/restaurant";
import { hasSupabaseEnv } from "@/shared/supabase/env";
import { FormMessage } from "@/shared/ui/form";

export const metadata: Metadata = { title: "Staff sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "";
  const error = loginErrorMessage(
    typeof params.error === "string" ? params.error : undefined,
  );

  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="font-display text-2xl font-semibold tracking-wide text-white">
            {restaurant.displayName}
          </p>
          <p className="mt-1 text-sm text-brand-200">Staff terminal</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl">
          {hasSupabaseEnv ? null : (
            <div className="mb-4">
              <FormMessage status="info">
                No Supabase project connected yet. Copy <code>.env.example</code> to{" "}
                <code>.env.local</code>, add your project URL and anon key, then restart
                the dev server.
              </FormMessage>
            </div>
          )}

          {error ? (
            <div className="mb-4">
              <FormMessage status="error">{error}</FormMessage>
            </div>
          ) : null}

          {hasSupabaseEnv ? (
            <>
              <GoogleButton next={next} />

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                  or
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            </>
          ) : null}

          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-xs text-brand-300">
          <Link href="/" className="hover:text-white">
            Back to the {restaurant.name} website
          </Link>
        </p>
      </div>
    </main>
  );
}
