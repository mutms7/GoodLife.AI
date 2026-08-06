"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/marks";
import { FirstRun } from "@/components/app/first-run";
import { MobileHeader, Rail, TabBar, type Screen } from "@/components/app/rail";
import { Ideas, Week, YourData } from "@/components/app/screens";
import { Composer, CoachMessage, MessageList, PlanCard, useScrollToLatest } from "@/components/app/thread";
import { classifyMessage, coachReply, emptyProfile, getDailyActions, isModelSafe, noteFor, type Profile } from "@/lib/advice";
import { MODEL_LABEL, loadModel, streamReply, unloadModel, webgpuSupported, type ModelStatus } from "@/lib/llm";
import { clear, dateKey, emptyData, exportFile, load, recentDays, save, streakFrom, type Message, type SavedData } from "@/lib/storage";

const HASH_SCREENS: Record<string, Screen> = { "#ideas": "ideas", "#data": "data", "#week": "week", "#first-run": "onboard" };

function greeting(hour = new Date().getHours()) {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function statusLine(status: ModelStatus, progress: number) {
  if (status === "ready") return `Local model · ${MODEL_LABEL}`;
  if (status === "loading") return `Loading the local model · ${Math.round(progress * 100)}%`;
  if (status === "error") return "Fixed guidance · the model didn't load";
  if (status === "unsupported") return "Fixed guidance · this browser has no WebGPU";
  return "Fixed guidance · the local model is off";
}

export default function App() {
  const [data, setData] = useState<SavedData>(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<Screen>("today");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<ModelStatus>("off");
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState<Message | null>(null);

  const startModel = useCallback(async () => {
    if (!webgpuSupported()) {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");
    setProgress(0);
    try {
      await loadModel((fraction) => setProgress(fraction));
      setStatus("ready");
      setData((current) => ({ ...current, modelOn: true }));
    } catch {
      setStatus("error");
      setData((current) => ({ ...current, modelOn: false }));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = load();
      setData(saved);
      setLoaded(true);
      const fromHash = HASH_SCREENS[window.location.hash];
      if (fromHash) setScreen(fromHash);
      else if (!saved.profile) setScreen("onboard");
      if (saved.modelOn) void startModel();
      else if (!webgpuSupported()) setStatus("unsupported");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [startModel]);

  useEffect(() => { if (loaded) save(data); }, [data, loaded]);
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined); }, []);

  const profile: Profile = data.profile ?? emptyProfile;
  const actions = useMemo(() => getDailyActions(profile), [profile]);
  const today = dateKey();
  const doneToday = useMemo(() => data.days[today] ?? [], [data.days, today]);
  const days = useMemo(() => recentDays(data.days), [data.days]);
  const streak = useMemo(() => streakFrom(data.days), [data.days]);
  const threadRef = useScrollToLatest(`${data.msgs.length}:${pending?.text ?? ""}`);

  const push = (message: Message) => setData((current) => ({ ...current, msgs: [...current.msgs, message] }));

  const toggleAction = (id: string) => setData((current) => {
    const existing = current.days[today] ?? [];
    const next = existing.includes(id) ? existing.filter((item) => item !== id) : [...existing, id];
    return { ...current, days: { ...current.days, [today]: next } };
  });

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || pending) return;
    setDraft("");
    push({ isUser: true, text: message });

    const domain = classifyMessage(message);
    const fixed = coachReply(message, profile);
    if (!isModelSafe(domain)) {
      push({ isUser: false, text: fixed, note: noteFor(domain, "fixed") });
      return;
    }
    if (status !== "ready") {
      push({ isUser: false, text: fixed, note: noteFor(domain, "model-off") });
      return;
    }

    const note = noteFor(domain, "model");
    setPending({ isUser: false, text: "", note });
    try {
      const answer = await streamReply(profile.goodDay, message, (partial) => setPending({ isUser: false, text: partial, note }));
      setPending(null);
      if (answer) push({ isUser: false, text: answer, note });
      else push({ isUser: false, text: fixed, note: noteFor(domain, "model-failed") });
    } catch {
      setPending(null);
      push({ isUser: false, text: fixed, note: noteFor(domain, "model-failed") });
    }
  };

  const toggleModel = () => {
    if (status === "ready") {
      void unloadModel();
      setStatus("off");
      setData((current) => ({ ...current, modelOn: false }));
      return;
    }
    void startModel();
  };

  const clearAll = () => {
    clear();
    void unloadModel();
    setData(emptyData);
    setStatus(webgpuSupported() ? "off" : "unsupported");
    setScreen("onboard");
  };

  const finishFirstRun = (next: Profile) => {
    setData((current) => ({ ...current, profile: next }));
    setScreen("today");
  };

  const needsFirstRun = loaded && !data.profile && (screen === "today" || screen === "week");
  const current: Screen = needsFirstRun ? "onboard" : screen;
  const dateLabel = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const countLabel = `${doneToday.length} of 3 done`;

  return (
    <div className="app-shell">
      <Rail screen={current} setScreen={setScreen} days={days} streak={streak} />
      <MobileHeader
        title={current === "onboard" ? "First run" : current === "ideas" ? "Ideas" : current === "data" ? "You" : current === "week" ? "Week" : "Today"}
        meta={current === "today" ? `${doneToday.length} of 3 · ${streak} ${streak === 1 ? "day" : "days"} back` : ""}
      />

      <main className="main-column">
        {!loaded && <div className="screen" />}

        {loaded && current === "today" && (
          <div className="screen">
            <div className="screen-header">
              <span className="screen-meta">{dateLabel} · {countLabel}</span>
              <span className="screen-avatar" aria-hidden="true"><Icon name="user" size={15} /></span>
            </div>
            <div className="thread" ref={threadRef}>
              <CoachMessage text={`${greeting()}. Here's what I'd try today. All three are small on purpose, and you can swap any of them.`} />
              <PlanCard actions={actions} done={doneToday} onToggle={toggleAction} onAsk={(text) => void send(text)} />
              <MessageList msgs={data.msgs} />
              {pending && <CoachMessage text={pending.text} note={pending.text ? pending.note : undefined} typing />}
            </div>
            <Composer draft={draft} setDraft={setDraft} onSend={() => void send(draft)} status={statusLine(status, progress)} busy={Boolean(pending)} />
          </div>
        )}

        {loaded && current === "onboard" && <FirstRun profile={data.profile} onFinish={finishFirstRun} />}
        {loaded && current === "ideas" && <Ideas />}
        {loaded && current === "week" && <Week profile={profile} days={days} />}
        {loaded && current === "data" && (
          <YourData status={status} progress={progress} onToggleModel={toggleModel} onExport={() => exportFile(data)} onClear={clearAll} />
        )}
      </main>

      <TabBar screen={current} setScreen={setScreen} />
    </div>
  );
}
