"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/marks";
import { FirstRun } from "@/components/app/first-run";
import { MobileHeader, Rail, TabBar, type Screen } from "@/components/app/rail";
import { Ideas, Week, YourData } from "@/components/app/screens";
import { Composer, CoachMessage, MessageList, ModelGate, PlanCard, useScrollToLatest } from "@/components/app/thread";
import { emptyProfile, getDailyActions, type Profile } from "@/lib/advice";
import { noteFor } from "@/lib/playbook";
import { MODEL_LABEL, chooseTopic, deleteModelCache, loadModel, streamReply, unloadModel, webgpuSupported, type ModelStatus } from "@/lib/llm";
import { clear, dateKey, emptyData, exportFile, load, recentDays, save, streakFrom, type Message, type SavedData } from "@/lib/storage";

const HASH_SCREENS: Record<string, Screen> = { "#ideas": "ideas", "#data": "data", "#week": "week", "#first-run": "onboard" };

const FAILED: Message = {
  isUser: false,
  text: "That one didn't come out right, so I'd rather not show you half an answer.",
  retryable: true,
};

const BLOCKED: Message = {
  isUser: false,
  text: "That answer was heading somewhere I won't go, which is telling you what to take. I can talk about the habit side of it, or a clinician can talk about the rest.",
  retryable: true,
};

function greeting(hour = new Date().getHours()) {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

export default function App() {
  const [data, setData] = useState<SavedData>(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<Screen>("today");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<ModelStatus>("off");
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState<Message | null>(null);
  const [lastAsk, setLastAsk] = useState("");

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

  /** `echo` replays a message that already sits in the thread, which is what
   *  the retry button needs. Everything else appends the person's turn first. */
  const send = async (text: string, echo = false) => {
    const message = text.trim();
    if (!message || pending) return;
    if (!echo) {
      setDraft("");
      push({ isUser: true, text: message });
    }

    // Crisis routing is the model's job now, and the model has to be here to do
    // it. That makes this gate the whole safety story before the download
    // finishes: nothing gets coached at, but nothing gets recognised either.
    if (status !== "ready") {
      push({ isUser: false, text: "I can't answer that one yet. The coach runs on your device, so the model has to finish downloading first.", note: noteFor(undefined, "model-off") });
      return;
    }

    setLastAsk(message);
    setPending({ isUser: false, text: "", note: undefined });
    try {
      // First pass: the model reads the playbook's descriptions and names the
      // topic. Only that topic's notes go into the answering prompt.
      const topic = await chooseTopic(message);
      if (topic.fixedReply) {
        setPending(null);
        push({ isUser: false, text: topic.fixedReply, note: noteFor(topic, "crisis") });
        return;
      }

      const note = noteFor(topic, "model");
      setPending({ isUser: false, text: "", note });
      const result = await streamReply(
        { goodDay: profile.goodDay, message, notes: topic.notes },
        (partial) => setPending({ isUser: false, text: partial, note }),
      );
      setPending(null);
      if (!result?.ok) {
        // A blocked reply is a different thing from a failed one, and the note
        // says which, rather than blaming the model for our own guardrail.
        const blocked = result?.reason === "blocked";
        push({
          ...(blocked ? BLOCKED : FAILED),
          note: noteFor(topic, blocked ? "model-blocked" : "model-failed"),
        });
        return;
      }
      // The disclaimer is appended here rather than asked for in the prompt, so
      // a small model can't drop it or reword it into something softer.
      push({ isUser: false, text: topic.sayAfter ? `${result.text} ${topic.sayAfter}` : result.text, note });
    } catch {
      setPending(null);
      push({ ...FAILED, note: noteFor(undefined, "model-failed") });
    }
  };

  const retry = () => {
    if (!lastAsk) return;
    setData((current) => ({ ...current, msgs: current.msgs.filter((msg) => !msg.retryable) }));
    void send(lastAsk, true);
  };

  const toggleModel = () => {
    if (status === "ready") {
      void deleteModelCache();
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
              <CoachMessage text={`${greeting()}. Here's what I'd try today. All three are small on purpose, and you can check off whichever ones you actually do.`} />
              <PlanCard actions={actions} done={doneToday} onToggle={toggleAction} onAsk={(text) => void send(text)} canAsk={status === "ready"} />
              <MessageList msgs={data.msgs} onRetry={retry} />
              {pending && <CoachMessage text={pending.text} note={pending.text ? pending.note : undefined} typing />}
            </div>
            {status === "ready"
              ? <Composer draft={draft} setDraft={setDraft} onSend={() => void send(draft)} status={`Local model · ${MODEL_LABEL}`} busy={Boolean(pending)} />
              : <ModelGate status={status} progress={progress} onStart={() => void startModel()} />}
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
