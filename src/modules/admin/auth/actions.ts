"use server";

import { redirect } from "next/navigation";

import { createServerSupabase } from "@/shared/supabase/server";
import { hasSupabaseEnv } from "@/shared/supabase/env";

import { adminDestination } from "./session";

export type SignInState = { error?: string; email?: string } | undefined;

export async function signIn(
  _state: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    return { error: "Enter your email and password.", email };
  }

  if (!hasSupabaseEnv) {
    return {
      error: "Supabase is not configured yet. Add your keys to .env.local and restart.",
      email,
    };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "That email and password combination did not work.", email };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return {
      error: "This login has no staff profile yet. Ask your manager to set it up.",
      email,
    };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { error: "This account has been switched off. Speak to your manager.", email };
  }

  redirect(adminDestination(next, profile.role));
}

export async function signOut(): Promise<never> {
  if (hasSupabaseEnv) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
