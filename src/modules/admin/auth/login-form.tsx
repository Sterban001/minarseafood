"use client";

import { useActionState } from "react";

import { Field, FormMessage, Input } from "@/shared/ui/form";
import { SubmitButton } from "@/shared/ui/submit-button";

import { signIn, type SignInState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<SignInState, FormData>(signIn, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />

      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state?.email ?? ""}
          placeholder="waiter@minarseafood.com"
          required
        />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Field>

      {state?.error ? <FormMessage status="error">{state.error}</FormMessage> : null}

      <SubmitButton size="lg" className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>

      <p className="text-center text-xs text-slate-500">
        Your manager creates these logins. Every order you punch is recorded under your
        name.
      </p>
    </form>
  );
}
