"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { acceptDesktopAuthCallback, authRedirectUrl, getSupabase, isVerified, setStaySignedIn, supabaseConfigured } from "@/lib/supabase";
import { withAuthTimeout } from "@/lib/auth-timeout";

type Mode = "login" | "signup" | "forgot";

export function AuthGate({ children }: { children: (account: { user: User; signOut: () => Promise<void> }) => ReactNode }) {
  const configured = supabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const [recovering, setRecovering] = useState(false);
  const [authNotice, setAuthNotice] = useState("");

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    let active = true;
    void withAuthTimeout(supabase.auth.getSession(), 8_000, "GoodLife.AI could not reopen your account. You can try signing in again.")
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) setSession(data.session);
      })
      .catch((error) => {
        if (active) setAuthNotice(error instanceof Error ? error.message : "GoodLife.AI could not reopen your account. Try signing in again.");
      })
      .finally(() => { if (active) setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
    });
    const dispose = window.goodlifeDesktop?.onAuthCallback?.((url) => {
      setAuthNotice("Connected. Starting GoodLife.AI...");
      void acceptDesktopAuthCallback(url)
        .then((next) => { if (active) { setSession(next); setAuthNotice(""); } })
        .catch((error) => {
          if (active) setAuthNotice(error instanceof Error ? error.message : "Sign-in did not finish. Please try again.");
        });
    });
    return () => { active = false; data.subscription.unsubscribe(); dispose?.(); };
  }, [configured]);

  if (loading) return <AuthShell><p className="auth-status">Opening your account…</p></AuthShell>;
  if (!configured) return <AuthShell><h1>Accounts need one final connection</h1><p className="auth-copy">The app is ready for Supabase, but this build does not have its public project URL and anonymous key yet.</p></AuthShell>;
  if (!isVerified(session)) return <AuthForm session={session} notice={authNotice} onClearNotice={() => setAuthNotice("")} />;
  if (recovering) return <ResetPassword onDone={() => setRecovering(false)} />;
  return <>{children({ user: session!.user, signOut: async () => {
    try { await withAuthTimeout(getSupabase().auth.signOut()); }
    finally { setSession(null); }
  } })}</>;
}

function AuthShell({ children }: { children: ReactNode }) {
  return <main className="auth-page"><section className="auth-card"><div className="auth-brand">goodlife<span>.ai</span></div>{children}</section></main>;
}

function AuthForm({ session, notice, onClearNotice }: { session: Session | null; notice: string; onClearNotice: () => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [password, setPassword] = useState("");
  const [stay, setStay] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(session ? "Check your email and verify your account before continuing." : "");

  const submit = async () => {
    setBusy(true); setMessage(""); onClearNotice(); setStaySignedIn(stay);
    const supabase = getSupabase();
    try {
      if (mode === "forgot") {
        const { error } = await withAuthTimeout(supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() }));
        if (error) throw error;
        setMessage("Password reset sent. Check your email.");
      } else if (mode === "signup") {
        const { error } = await withAuthTimeout(supabase.auth.signUp({ email, password, options: { emailRedirectTo: authRedirectUrl() } }));
        if (error) throw error;
        setMessage("Account created. Check your email to verify it.");
      } else {
        const { error } = await withAuthTimeout(supabase.auth.signInWithPassword({ email, password }));
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That did not work. Try again.");
    } finally { setBusy(false); }
  };

  const google = async () => {
    setBusy(true); setMessage(""); onClearNotice(); setStaySignedIn(stay);
    try {
      const desktop = Boolean(window.goodlifeDesktop?.isDesktop);
      const { data, error } = await withAuthTimeout(getSupabase().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: authRedirectUrl(), skipBrowserRedirect: desktop },
      }));
      if (error) throw error;
      if (desktop) {
        if (!data.url) throw new Error("Google sign-in could not be opened. Please try again.");
        window.open(data.url, "_blank", "noopener,noreferrer");
        setMessage("Finish signing in in your browser. It will say Connected when you can return here.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google sign-in did not start. Try again.");
    } finally { setBusy(false); }
  };

  const resend = async () => {
    setBusy(true); onClearNotice();
    try {
      const { error } = await withAuthTimeout(getSupabase().auth.resend({ type: "signup", email, options: { emailRedirectTo: authRedirectUrl() } }));
      setMessage(error?.message ?? "Verification email sent again.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification email could not be sent. Try again.");
    } finally { setBusy(false); }
  };

  return (
    <AuthShell>
      <h1>{mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back"}</h1>
      <p className="auth-copy">Sign in to keep your habits in sync. The AI still runs only on this device.</p>
      <label className="auth-field">Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      {mode !== "forgot" && <label className="auth-field">Password<input type="password" minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
      {mode !== "forgot" && <label className="auth-check"><input type="checkbox" checked={stay} onChange={(event) => setStay(event.target.checked)} /> Stay signed in</label>}
      <button className="btn btn-primary auth-submit" type="button" disabled={busy || !email || (mode !== "forgot" && password.length < 8)} onClick={() => void submit()}>{busy ? "One moment…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Log in"}</button>
      {mode !== "forgot" && <><div className="auth-or"><span>or</span></div><button className="btn btn-secondary auth-google" type="button" disabled={busy} onClick={() => void google()}>Continue with Google</button></>}
      {(notice || message) && <p className="auth-message" role="status">{notice || message}</p>}
      {session && !session.user.email_confirmed_at && <button className="auth-link" type="button" onClick={() => void resend()}>Resend verification email</button>}
      <div className="auth-links">
        {mode === "login" ? <><button type="button" onClick={() => setMode("signup")}>Create an account</button><button type="button" onClick={() => setMode("forgot")}>Forgot password?</button></> : <button type="button" onClick={() => setMode("login")}>Back to log in</button>}
      </div>
    </AuthShell>
  );
}

function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const update = async () => {
    setBusy(true); setMessage("");
    try {
      const { error } = await withAuthTimeout(getSupabase().auth.updateUser({ password }));
      if (error) setMessage(error.message);
      else onDone();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your password could not be saved. Try again.");
    } finally { setBusy(false); }
  };
  return <AuthShell><h1>Choose a new password</h1><p className="auth-copy">Use at least eight characters.</p><label className="auth-field">New password<input type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><button type="button" className="btn btn-primary auth-submit" disabled={busy || password.length < 8} onClick={() => void update()}>{busy ? "Saving…" : "Save password"}</button>{message && <p className="auth-message" role="status">{message}</p>}</AuthShell>;
}
