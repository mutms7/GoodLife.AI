"use client";

import { useEffect, useMemo, useState } from "react";

function desktopCallbackUrl() {
  const current = new URL(window.location.href);
  const callback = new URL("goodlife://auth-callback");
  callback.search = current.search;
  callback.hash = current.hash;
  return callback.href;
}

export default function DesktopAuthComplete() {
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState("");
  const callback = useMemo(() => typeof window === "undefined" ? "goodlife://auth-callback" : desktopCallbackUrl(), []);

  useEffect(() => {
    const current = new URL(window.location.href);
    const message = current.searchParams.get("error_description") || new URLSearchParams(current.hash.slice(1)).get("error_description");
    if (message) {
      setError(message);
      return;
    }
    setOpened(true);
    const timer = window.setTimeout(() => { window.location.href = callback; }, 150);
    return () => window.clearTimeout(timer);
  }, [callback]);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">goodlife<span>.ai</span></div>
        <h1>{error ? "Sign-in did not finish" : "Connected"}</h1>
        <p className="auth-copy">{error || "GoodLife.AI is finishing sign-in in the desktop app. You can close this tab."}</p>
        {!error && <a className="btn btn-primary auth-submit" href={callback}>{opened ? "Open GoodLife.AI again" : "Open GoodLife.AI"}</a>}
      </section>
    </main>
  );
}
