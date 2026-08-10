"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthGate } from "@/components/auth/auth-gate";
import { AccountButton, MobileHeader, Rail, TabBar, type Screen } from "@/components/app/rail";
import { Habits, Ideas, Settings, Week, Year, YourData } from "@/components/app/screens";
import { Composer, CoachMessage, MessageList, ModelGate, PlanCard, useScrollToLatest } from "@/components/app/thread";
import { completionCounts, completionCountsBefore, emptyProfile, getAction, graduatedActions, hasGraduated, rankActions, type Action, type Profile } from "@/lib/advice";
import { dayStarter, responseTitle } from "@/lib/conversation-ui";
import { noteFor } from "@/lib/playbook";
import { MODEL_LABEL, chooseTopic, deleteModelCache, loadModel, stopGeneration, streamReply, unloadModel, webgpuSupported, type ModelStatus } from "@/lib/llm";
import { clear, dateKey, emptyData, exportFile, freshData, load, recentDays, save, streakFrom, type Conversation, type Message, type SavedData } from "@/lib/storage";
import { clearCloudData, defaultSyncPreferences, getCloudSyncPreferences, pullCloudData, replaceCloudSyncPreferences, type SyncPreferences } from "@/lib/cloud-sync";

/** The date key `back` days before the given one. Derived from the key rather
 *  than from `new Date()`, so callers stay pure functions of their input. */
function keyBefore(today: string, back: number): string {
  const [year, month, day] = today.split("-").map(Number);
  return dateKey(new Date(year, month - 1, day - back));
}

/** Today and the six days before it, newest first. Matches what `recentDays`
 *  walks, so the two line up. */
function weekKeys(today: string): string[] {
  return Array.from({ length: 7 }, (_, index) => keyBefore(today, index));
}

const HASH_SCREENS: Record<string, Screen> = { "#ideas": "ideas", "#data": "data", "#week": "week", "#year": "year", "#habits": "habits", "#settings": "settings" };

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
  return <AuthGate>{(account) => <ProductApp account={account} />}</AuthGate>;
}

function ensureDefaultHabits(saved: SavedData): SavedData {
  if (!saved.profile || saved.settings.habitsConfigured) return saved;
  const habits = rankActions(saved.profile).map((action) => ({ id: `habit-${action.id}`, actionId: action.id, title: action.title, paused: false }));
  return { ...saved, habits, settings: { ...saved.settings, habitsConfigured: true } };
}

const SYNC_OPTIONS: { key: keyof SyncPreferences; label: string }[] = [
  { key: "profile", label: "Profile answers" },
  { key: "habits", label: "Habit pool" },
  { key: "completions", label: "Completions and swaps" },
  { key: "settings", label: "Settings" },
  { key: "conversations", label: "Conversations for seven days" },
];

function SyncConsent({ preferences, onChange, onContinue }: { preferences: SyncPreferences; onChange: (next: SyncPreferences) => void; onContinue: () => void }) {
  return <main className="auth-page"><section className="auth-card"><div className="auth-brand">goodlife<span>.ai</span></div><h1>Choose what syncs</h1><p className="auth-copy">The AI always stays on this device. Choose which account information can follow you to your other devices.</p><div className="sync-options">{SYNC_OPTIONS.map((option) => <label className="auth-check" key={option.key}><input type="checkbox" checked={preferences[option.key]} onChange={(event) => onChange({ ...preferences, [option.key]: event.target.checked })} /> {option.label}</label>)}</div><button type="button" className="btn btn-primary auth-submit" onClick={onContinue}>Save and continue</button></section></main>;
}

function ProductApp({ account }: { account: { user: User; signOut: () => Promise<void> } }) {
  const [data, setData] = useState<SavedData>(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<Screen>("today");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<ModelStatus>("off");
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState<Message | null>(null);
  const [lastAsk, setLastAsk] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncConfirmed, setSyncConfirmed] = useState(false);
  const [syncPreferences, setSyncPreferences] = useState<SyncPreferences>(defaultSyncPreferences);
  const [cloudClearPending, setCloudClearPending] = useState(false);
  const msgsRef = useRef<Message[]>([]);
  const syncStarted = useRef(false);
  const syncSuspended = useRef(false);
  const mutateData = useCallback((updater: (current: SavedData) => SavedData) => {
    setData((current) => {
      const next = updater(current);
      return next === current ? current : { ...next, updatedAt: Date.now() };
    });
  }, []);

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
      const saved = ensureDefaultHabits(load(account.user.id));
      setData(saved);
      if (localStorage.getItem(`goodlife-pending-cloud-clear-${account.user.id}`)) {
        syncSuspended.current = true;
        setCloudClearPending(true);
      }
      const consentRaw = localStorage.getItem(`goodlife-sync-consent-${account.user.id}`);
      let localPreferences: SyncPreferences | null = null;
      if (consentRaw) {
        try { localPreferences = { ...defaultSyncPreferences, ...JSON.parse(consentRaw) as Partial<SyncPreferences> }; } catch { /* ask again */ }
      }
      void getCloudSyncPreferences(account.user.id).catch(() => null).then((cloudPreferences) => {
        const chosen = cloudPreferences ?? localPreferences;
        if (chosen) { setSyncPreferences(chosen); localStorage.setItem(`goodlife-sync-consent-${account.user.id}`, JSON.stringify(chosen)); setSyncConfirmed(true); }
        setLoaded(true);
      });
      const fromHash = HASH_SCREENS[window.location.hash];
      if (fromHash) setScreen(fromHash);
      else if (!saved.profile) setScreen("data");
      if (saved.modelOn) void startModel();
      else if (!webgpuSupported()) setStatus("unsupported");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [account.user.id, startModel]);

  useEffect(() => {
    if (!cloudClearPending) return;
    const pendingKey = `goodlife-pending-cloud-clear-${account.user.id}`;
    const retry = () => {
      if (!navigator.onLine) return;
      void clearCloudData(account.user.id).then(() => {
        localStorage.removeItem(pendingKey);
        setCloudClearPending(false);
        setData((current) => {
          if (current.profile) syncSuspended.current = false;
          return { ...current };
        });
      }).catch(() => undefined);
    };
    window.addEventListener("online", retry);
    retry();
    return () => window.removeEventListener("online", retry);
  }, [account.user.id, cloudClearPending]);

  useEffect(() => {
    if (!loaded || !syncConfirmed || syncStarted.current || syncSuspended.current) return;
    syncStarted.current = true;
    void pullCloudData(account.user.id, data, syncPreferences)
      .then((synced) => setData(ensureDefaultHabits(synced)))
      .catch(() => undefined)
      .finally(() => setCloudReady(true));
  }, [account.user.id, data, loaded, syncConfirmed, syncPreferences]);

  useEffect(() => {
    if (!loaded) return;
    save(data, account.user.id);
    if (!cloudReady || !syncConfirmed || syncSuspended.current) return;
    const sync = () => {
      if (!navigator.onLine || syncSuspended.current) return;
      const snapshot = load(account.user.id);
      const dirtyKey = `goodlife-sync-preferences-dirty-${account.user.id}`;
      if (localStorage.getItem(dirtyKey)) {
        void replaceCloudSyncPreferences(account.user.id, syncPreferences)
          .then(() => pullCloudData(account.user.id, snapshot, syncPreferences))
          .then((synced) => { localStorage.removeItem(dirtyKey); if (synced.updatedAt !== snapshot.updatedAt) setData(ensureDefaultHabits(synced)); })
          .catch(() => undefined);
        return;
      }
      void pullCloudData(account.user.id, snapshot, syncPreferences).then((synced) => {
        if (synced.updatedAt !== snapshot.updatedAt) setData(ensureDefaultHabits(synced));
      }).catch(() => undefined);
    };
    const timer = window.setTimeout(sync, 800);
    window.addEventListener("online", sync);
    return () => { window.clearTimeout(timer); window.removeEventListener("online", sync); };
  }, [account.user.id, cloudReady, data, loaded, syncConfirmed, syncPreferences]);
  const activeConversation = data.conversations.find((conversation) => conversation.id === data.activeConversationId) ?? data.conversations[0];
  const activeMsgs = activeConversation?.msgs ?? data.msgs;
  useEffect(() => { msgsRef.current = activeMsgs; }, [activeMsgs]);
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined); }, []);
  useEffect(() => { document.documentElement.dataset.fontSize = data.settings.fontSize; }, [data.settings.fontSize]);

  const profile: Profile = data.profile ?? emptyProfile;
  const today = dateKey();

  const actionsForDate = useCallback((key: string): Action[] => {
    if (!data.settings.habitsConfigured) return [];
    const swapped = data.swaps[key] ?? [];
    const countsBefore = completionCountsBefore(data.days, key);
    const pool = data.habits.filter((habit) => !habit.paused).map((habit) => {
      const source = habit.actionId ? getAction(habit.actionId) : undefined;
      return source ? { ...source, title: habit.title } : { id: habit.id, kicker: "Your habit", title: habit.title, body: habit.title, short: habit.title };
    });
    const picked = pool.filter((action) => !hasGraduated(countsBefore, action.id) && !swapped.includes(action.id)).slice(0, 3);
    for (const action of pool) {
      if (picked.length >= 3) break;
      if (!swapped.includes(action.id) && !picked.some((item) => item.id === action.id)) picked.push(action);
    }
    return picked;
  }, [data.days, data.habits, data.settings.habitsConfigured, data.swaps]);

  // Everything below is derived, not stored. What was shown on a given day is
  // a pure function of the profile, the completions before it, and that day's
  // swaps, so there's no bookkeeping to keep in sync and no setState in an
  // effect to write it.
  const actions = useMemo(() => actionsForDate(today), [actionsForDate, today]);
  const counts = useMemo(() => completionCounts(data.days), [data.days]);
  const doneToday = useMemo(() => data.days[today] ?? [], [data.days, today]);
  const streak = useMemo(() => streakFrom(data.days), [data.days]);
  const graduated = useMemo(() => graduatedActions(counts), [counts]);

  const week = useMemo(
    () => weekKeys(today).map((key) => ({ key, ids: actionsForDate(key).map((action) => action.id) })),
    [actionsForDate, today],
  );
  const servedByDay = useMemo(() => Object.fromEntries(week.map(({ key, ids }) => [key, ids])), [week]);
  const days = useMemo(() => recentDays(data.days, servedByDay), [data.days, servedByDay]);
  const threadRef = useScrollToLatest(`${activeMsgs.length}:${pending?.text ?? ""}`);

  const updateActiveConversation = (current: SavedData, msgs: Message[]): SavedData => {
    const id = current.activeConversationId;
    const conversations = current.conversations.map((conversation) => conversation.id === id ? { ...conversation, msgs, title: responseTitle(msgs) } : conversation);
    return { ...current, conversations, msgs, activeConversationId: id };
  };
  const push = (message: Message) => mutateData((current) => updateActiveConversation(current, [...(current.conversations.find((conversation) => conversation.id === current.activeConversationId)?.msgs ?? current.msgs), message]));

  const toggleAction = (id: string) => mutateData((current) => {
    const existing = current.days[today] ?? [];
    const next = existing.includes(id) ? existing.filter((item) => item !== id) : [...existing, id];
    return { ...current, days: { ...current.days, [today]: next } };
  });

  /** Push one action aside for today. The next-best candidate takes the slot,
   *  and the swap is remembered so a reload doesn't undo it. */
  const swapAction = (id: string) => mutateData((current) => {
    const existing = current.swaps[today] ?? [];
    if (existing.includes(id)) return current;
    return { ...current, swaps: { ...current.swaps, [today]: [...existing, id] } };
  });

  /** `echo` replays a message that already sits in the thread, which is what
   *  the retry button needs. Everything else appends the person's turn first. */
  const send = async (text: string, echo = false) => {
    const message = text.trim();
    if (!message || pending) return;

    // Snapshotted before the new turn is pushed, and read from a ref because
    // The active conversation in this closure is a render behind. Our own error copy is
    // dropped: it's app text, not something the coach said.
    const history = msgsRef.current
      .filter((msg) => !msg.retryable)
      .map((msg) => ({ isUser: msg.isUser, text: msg.text }));

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
        {
          goodDay: profile.goodDay,
          message,
          notes: topic.notes,
          // Prior turns, so "why?" and "that won't work for me" land as
          // follow-ups rather than as standalone questions.
          history,
        },
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
    mutateData((current) => updateActiveConversation(current, (current.conversations.find((conversation) => conversation.id === current.activeConversationId)?.msgs ?? current.msgs).filter((msg) => !msg.retryable)));
    void send(lastAsk, true);
  };

  const newConversation = () => {
    if (pending) { stopGeneration(); setPending(null); }
    const conversation: Conversation = { id: `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: today, title: "New conversation", msgs: [] };
    mutateData((current) => ({ ...current, conversations: [...current.conversations, conversation], activeConversationId: conversation.id, msgs: [] }));
    setLastAsk("");
    setScreen("today");
  };

  const openConversation = (id: string) => {
    if (!data.conversations.some((conversation) => conversation.id === id)) return;
    if (pending) { stopGeneration(); setPending(null); }
    mutateData((current) => ({ ...current, activeConversationId: id, msgs: current.conversations.find((conversation) => conversation.id === id)?.msgs ?? [] }));
    setLastAsk("");
    setScreen("today");
  };

  const openDay = (key: string) => {
    setSelectedDay(key);
    setScreen("week");
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
    syncSuspended.current = true;
    localStorage.setItem(`goodlife-pending-cloud-clear-${account.user.id}`, "1");
    setCloudClearPending(true);
    clear(account.user.id);
    void unloadModel();
    setData(freshData());
    setStatus(webgpuSupported() ? "off" : "unsupported");
    setScreen("data");
  };

  const finishFirstRun = (next: Profile) => {
    const habits = rankActions(next).map((action) => ({ id: `habit-${action.id}`, actionId: action.id, title: action.title, paused: false }));
    mutateData((current) => ({ ...current, profile: next, habits, settings: { ...current.settings, habitsConfigured: true } }));
    if (!cloudClearPending) syncSuspended.current = false;
    setScreen("today");
  };

  const current: Screen = loaded && !data.profile && screen !== "data" ? "data" : screen;
  const dateLabel = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  // Counted against the rows actually shown, so completions carried over from
  // an earlier set of three can't push this past the total.
  const doneCount = doneToday.filter((id) => actions.some((action) => action.id === id)).length;
  const countLabel = `${doneCount} of ${actions.length} done`;

  const viewedDay = selectedDay || today;
  const viewedServed = actionsForDate(viewedDay);
  const habitPool = rankActions(profile);
  const habits = data.habits;

  if (loaded && !syncConfirmed) {
    return <SyncConsent preferences={syncPreferences} onChange={setSyncPreferences} onContinue={() => {
      localStorage.setItem(`goodlife-sync-consent-${account.user.id}`, JSON.stringify(syncPreferences));
      localStorage.setItem(`goodlife-sync-preferences-dirty-${account.user.id}`, "1");
      setSyncConfirmed(true);
    }} />;
  }

  return (
    <div className="app-shell">
      <Rail
        screen={current}
        setScreen={setScreen}
        days={days}
        streak={streak}
        conversations={data.conversations}
        activeConversationId={data.activeConversationId}
        onOpenDay={openDay}
        onOpenConversation={openConversation}
        onNewConversation={newConversation}
      />
      <MobileHeader
        title={current === "ideas" ? "Ideas" : current === "data" ? "Your Data" : current === "week" ? "Your week" : current === "year" ? "Your year" : current === "habits" ? "Habits" : current === "settings" ? "Settings" : "Your day"}
        meta={current === "today" ? `${doneCount} of ${actions.length} · ${streak} ${streak === 1 ? "day" : "days"} back` : ""}
      />

      <main className="main-column">
        {!loaded && <div className="screen" />}

        {loaded && current === "today" && (
          <div className="screen">
            <div className="screen-header">
              <span className="screen-meta">{dateLabel} · {countLabel}</span>
              <AccountButton label={account.user.email ?? "Account"} menuOpen={accountMenuOpen} onToggleMenu={() => setAccountMenuOpen((open) => !open)} onClick={() => { setAccountMenuOpen(false); setScreen("settings"); }} onSignOut={() => void account.signOut()} />
            </div>
            {/* A log, so a screen reader announces each finished reply. The
                streaming bubble is excluded below, or it would read out every
                token as the model produced it. */}
            <div className="thread" ref={threadRef} role="log" aria-live="polite" aria-relevant="additions">
              <CoachMessage text={dayStarter(greeting(), actions.length)} />
              {actions.length > 0 ? (
                <PlanCard
                  actions={actions}
                  done={doneToday}
                  counts={counts}
                  onToggle={toggleAction}
                  onSwap={swapAction}
                />
              ) : activeMsgs.length === 0 ? (
                <div className="empty-habits-card">
                  <div><strong>Start with one habit</strong><span>Add something small you want to repeat. It will appear here and in Your week.</span></div>
                  <button type="button" className="btn btn-primary" onClick={() => setScreen("habits")}>Add a habit</button>
                </div>
              ) : null}
              <MessageList msgs={activeMsgs} onRetry={retry} />
              {pending && (
                <div aria-hidden="true">
                  <CoachMessage text={pending.text} note={pending.text ? pending.note : undefined} typing />
                </div>
              )}
            </div>
            <p className="sr-only" role="status">{pending ? "The coach is writing" : ""}</p>
            {status === "ready"
              ? (
                <Composer
                  draft={draft}
                  setDraft={setDraft}
                  onSend={() => void send(draft)}
                  onStop={stopGeneration}
                  status={`Local model · ${MODEL_LABEL}`}
                  busy={Boolean(pending)}
                />
              )
              : <ModelGate status={status} progress={progress} onStart={() => void startModel()} />}
          </div>
        )}

        {loaded && current === "ideas" && <Ideas />}
        {loaded && current === "week" && (
          <Week
            days={days}
            selected={viewedDay}
            onSelect={setSelectedDay}
            served={viewedServed}
            done={data.days[viewedDay] ?? []}
            onToggle={(id) => mutateData((currentData) => {
              const existing = currentData.days[viewedDay] ?? [];
              const next = existing.includes(id) ? existing.filter((item) => item !== id) : [...existing, id];
              return { ...currentData, days: { ...currentData.days, [viewedDay]: next } };
            })}
            graduated={graduated}
          />
        )}
        {loaded && current === "year" && <Year days={data.days} />}
        {loaded && current === "habits" && <Habits
          habits={habits}
          actions={habitPool}
          onAdd={(action) => mutateData((currentData) => ({ ...currentData, habits: [...currentData.habits, { id: getAction(action.id) ? `habit-${action.id}-${Date.now()}` : action.id, actionId: getAction(action.id) ? action.id : undefined, title: action.title, paused: false }], settings: { ...currentData.settings, habitsConfigured: true } }))}
          onRename={(id, title) => mutateData((currentData) => ({ ...currentData, habits: (currentData.habits.length ? currentData.habits : habits).map((habit) => habit.id === id ? { ...habit, title } : habit) }))}
          onReorder={(id, direction) => mutateData((currentData) => {
            const list = [...(currentData.habits.length ? currentData.habits : habits)];
            const index = list.findIndex((habit) => habit.id === id);
            const next = index + direction;
            if (index < 0 || next < 0 || next >= list.length) return currentData;
            [list[index], list[next]] = [list[next], list[index]];
            return { ...currentData, habits: list };
          })}
          onTogglePause={(id) => mutateData((currentData) => ({ ...currentData, habits: (currentData.habits.length ? currentData.habits : habits).map((habit) => habit.id === id ? { ...habit, paused: !habit.paused } : habit) }))}
          onDelete={(id) => mutateData((currentData) => ({ ...currentData, habits: (currentData.habits.length ? currentData.habits : habits).filter((habit) => habit.id !== id) }))}
        />}
        {loaded && current === "data" && (
          <YourData profile={data.profile} onFinishProfile={finishFirstRun} status={status} progress={progress} onToggleModel={toggleModel} onExport={() => exportFile(data)} onClear={clearAll} cloudClearPending={cloudClearPending} />
        )}
        {loaded && current === "settings" && <Settings fontSize={data.settings.fontSize} onFontSize={(fontSize) => mutateData((currentData) => ({ ...currentData, settings: { ...currentData.settings, fontSize } }))} syncPreferences={syncPreferences} onSyncPreferences={(next) => { setSyncPreferences(next); localStorage.setItem(`goodlife-sync-consent-${account.user.id}`, JSON.stringify(next)); localStorage.setItem(`goodlife-sync-preferences-dirty-${account.user.id}`, "1"); }} accountLabel={account.user.email} onSignOut={() => void account.signOut()} />}
      </main>

      <TabBar screen={current} setScreen={setScreen} />
    </div>
  );
}
