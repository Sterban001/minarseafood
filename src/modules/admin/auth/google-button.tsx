"use client";

import { useState } from "react";

import { createClient } from "@/shared/supabase/client";
import { buttonClass } from "@/shared/ui/button";
import { FormMessage } from "@/shared/ui/form";

/**
 * Owner-facing sign-in. Waiters still get an email and password handed to them,
 * because a shared floor tablet is the wrong place for somebody's personal
 * Google session — see the auth notes in HANDOVER.md.
 */
export function GoogleButton({ next }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function start() {
    setError(null);
    setPending(true);

    try {
      const callback = new URL("/admin/auth/callback", window.location.origin);
      if (next) callback.searchParams.set("next", next);

      const { data, error: oauthError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback.toString(),
          // Always show the account chooser. A silent sign-in as whoever last
          // used the browser would attribute orders to the wrong person.
          queryParams: { prompt: "select_account" },
          skipBrowserRedirect: true,
        },
      });

      if (oauthError || !data.url) {
        setError("Could not reach Google. Check the connection and try again.");
        setPending(false);
        return;
      }

      window.location.assign(data.url);
    } catch {
      setError("Could not start Google sign-in.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className={buttonClass({ variant: "outline", size: "lg", className: "w-full" })}
      >
        <GoogleMark />
        {pending ? "Taking you to Google…" : "Continue with Google"}
      </button>

      {error ? <FormMessage status="error">{error}</FormMessage> : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="size-4" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.09l3.01-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
