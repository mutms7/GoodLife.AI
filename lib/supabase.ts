"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { withAuthTimeout } from "@/lib/auth-timeout";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const DESKTOP_AUTH_BRIDGE_URL = "https://goodlifeai.vercel.app/auth/desktop";

let staySignedIn = true;

const authStorage = {
  getItem(key: string) {
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  },
  setItem(key: string, value: string) {
    const target = staySignedIn ? window.localStorage : window.sessionStorage;
    const other = staySignedIn ? window.sessionStorage : window.localStorage;
    other.removeItem(key);
    target.setItem(key, value);
  },
  removeItem(key: string) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

let client: SupabaseClient | null = null;

export function supabaseConfigured() {
  return Boolean(url && anonKey);
}

export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) throw new Error("GoodLife.AI account service is not configured.");
  client ??= createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storage: authStorage,
    },
  });
  return client;
}

export function setStaySignedIn(value: boolean) {
  staySignedIn = value;
}

export function authRedirectUrl() {
  const desktop = typeof window !== "undefined" && Boolean(window.goodlifeDesktop?.isDesktop);
  return desktop ? DESKTOP_AUTH_BRIDGE_URL : `${window.location.origin}/app`;
}

export function isVerified(session: Session | null) {
  return Boolean(session?.user.email_confirmed_at);
}

export async function acceptDesktopAuthCallback(callbackUrl: string) {
  const parsed = new URL(callbackUrl);
  if (parsed.protocol !== "goodlife:" || parsed.hostname !== "auth-callback") {
    throw new Error("GoodLife.AI received an invalid sign-in response.");
  }
  const params = new URLSearchParams(parsed.hash.slice(1));
  const code = parsed.searchParams.get("code");
  if (!code) throw new Error(parsed.searchParams.get("error_description") ?? params.get("error_description") ?? "The sign-in link was incomplete.");
  const { data, error } = await withAuthTimeout(getSupabase().auth.exchangeCodeForSession(code));
  if (error) throw error;
  if (!data.session) throw new Error("GoodLife.AI did not receive a completed sign-in session.");
  return data.session;
}
