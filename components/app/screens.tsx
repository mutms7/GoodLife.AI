"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/marks";
import { GRADUATE_AT, type Action, type Profile } from "@/lib/advice";
import type { ModelStatus } from "@/lib/llm";
import { dateKey, type Habit, type RecentDay } from "@/lib/storage";
import type { SyncPreferences } from "@/lib/cloud-sync";
import { FirstRun } from "@/components/app/first-run";

const IDEAS: { tag: string; tone: "sage" | "terracotta" | "neutral"; title: string; body: string; source: string }[] = [
  { tag: "Habits", tone: "sage", title: "Make it smaller than feels worth doing", body: "Two minutes is not a compromise, it's the whole trick. A habit you can do on your worst day is the only one that survives.", source: "After Atomic Habits" },
  { tag: "Money", tone: "terracotta", title: "Pay yourself first, then forget it", body: "An automatic transfer beats a good intention every month. Pick an amount that survives a bad week, not a perfect one.", source: "After The Wealthy Barber" },
  { tag: "Sleep", tone: "sage", title: "Hold the wake time, not the bedtime", body: "Your body takes its cue from when light hits it. Get the morning steady and the evening usually follows on its own.", source: "After Why We Sleep" },
  { tag: "Time", tone: "neutral", title: "You're not going to get to all of it", body: "Deciding what you're willing to leave undone is the actual work. A shorter list isn't a lower standard.", source: "After Four Thousand Weeks" },
  { tag: "Feelings", tone: "sage", title: "You can act before you feel like it", body: "Waiting to feel motivated is a long wait. Do the small thing while the doubt is still there, and let the mood catch up.", source: "After The Happiness Trap" },
  { tag: "People", tone: "terracotta", title: "Ask one more question than feels natural", body: "Most conversations improve when you stop preparing your next sentence. It costs nothing and people notice immediately.", source: "After How to Win Friends and Influence People" },
];

export function Ideas() {
  return (
    <div className="screen-scroll">
      <div className="screen-lead">
        <h3>Where the ideas come from</h3>
        <p>Try these ideas out. Keep what fits and leave the rest.</p>
      </div>
      <div className="idea-grid">
        {IDEAS.map((idea) => (
          <article className="idea-card" key={idea.title}>
            <span className={`idea-tag ${idea.tone}`}>{idea.tag}</span>
            <h4 className="idea-title">{idea.title}</h4>
            <p>{idea.body}</p>
            <span className="idea-source">{idea.source}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

const MODEL_STATUS: Record<ModelStatus, string> = {
  off: "Not downloaded. Conversation is off until it is.",
  loading: "Downloading",
  ready: "Downloaded and ready",
  error: "It didn't load here, so conversation is off.",
  unsupported: "This browser can't run it. WebGPU isn't available, so conversation is off.",
};

const DESKTOP_MODEL_STATUS: Record<ModelStatus, string> = {
  off: "Bundled with the app and ready to start.",
  loading: "Starting local SLM",
  ready: "Local SLM is running",
  error: "The bundled local SLM did not start.",
  unsupported: "This computer cannot run the local SLM because WebGPU is unavailable.",
};

export function YourData({ profile, onFinishProfile, status, progress, onToggleModel, onExport, onClear, cloudClearPending = false, desktop = false }: {
  profile: Profile | null;
  onFinishProfile: (next: Profile) => void;
  status: ModelStatus;
  progress: number;
  onToggleModel: () => void;
  onExport: () => void;
  onClear: () => void;
  cloudClearPending?: boolean;
  desktop?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const buttonLabel = desktop
    ? status === "loading" ? "Starting" : status === "error" || status === "off" ? "Start local SLM" : null
    : status === "ready" ? "Delete the download" : status === "loading" ? "Downloading" : status === "error" ? "Try again" : "Download the model";

  return (
    <div className="screen-scroll">
      {!profile && <FirstRun profile={profile} onFinish={onFinishProfile} />}
      <div className="screen-lead" style={{ maxWidth: 700 }}>
        <h3>Your data</h3>
        <p>Your model and coaching stay on this device. Your profile, habits, completions and settings sync only if you choose them. Conversations are deleted after seven days.</p>
      </div>

      <div className="data-stack">
        {cloudClearPending && <p className="auth-message" role="status">Local data is cleared. The online copy will be deleted as soon as this device reconnects.</p>}
        <div className="data-card">
          <div className="data-text">
            <span className="data-title">Export everything as JSON</span>
              <span className="data-sub">One file with your profile, habits, completions and conversation history.</span>
          </div>
          <button type="button" className="btn btn-primary" onClick={onExport}>Download</button>
        </div>

        <div className="data-card column">
          <div className="data-card-top">
            <div className="data-text" style={{ maxWidth: 520 }}>
              <span className="data-title">The local AI coach</span>
              <span className="data-sub">{desktop ? "Qwen2.5 1.5B, quantized and included with the Windows app. It starts locally through WebGPU and does not download again when you reopen GoodLife.AI." : "Qwen2.5 1.5B, quantized, running in your browser through WebGPU. About a 1.6 GB download, once per browser profile. Conversation needs it, so there is no coach until it is here. Deleting the download frees the disk space and turns conversation back off."}</span>
            </div>
            {buttonLabel && <button type="button" className="btn btn-secondary" onClick={onToggleModel} disabled={status === "loading" || status === "unsupported"}>{buttonLabel}</button>}
          </div>
          {status === "loading" && <div className="data-progress"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
          <div className={`data-status ${status === "ready" ? "" : status === "error" || status === "unsupported" ? "is-error" : "is-off"}`}>
            <i />
            {status === "loading" ? `${desktop ? DESKTOP_MODEL_STATUS.loading : MODEL_STATUS.loading}, ${Math.round(progress * 100)}%` : (desktop ? DESKTOP_MODEL_STATUS : MODEL_STATUS)[status]}
          </div>
        </div>

        <div className="data-danger">
          <div className="data-text">
            <span className="data-title">Start over</span>
            <span className="data-sub">{armed ? "This clears your good day, plans, streak and whole thread. There is no undo, so export first if you might need it." : "Deletes your profile and history on this device. It cannot be undone."}</span>
          </div>
          {armed ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setArmed(false)}>Keep it</button>
              <button type="button" className="btn btn-primary" onClick={() => { setArmed(false); onClear(); }}>Yes, clear it</button>
            </div>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => setArmed(true)}>Clear my data</button>
          )}
        </div>

        <p className="data-limits">GoodLife.AI is a reflection and education tool. It isn&apos;t medical, mental-health, legal or financial advice, and investment returns aren&apos;t guaranteed. Small local models get things wrong, especially on anything nuanced. For urgent safety concerns, contact local emergency services or a crisis line in your area.</p>
      </div>
    </div>
  );
}

export function Week({ days, selected, onSelect, served, done, onToggle, graduated }: {
  days: RecentDay[];
  selected: string;
  onSelect: (key: string) => void;
  served: Action[];
  done: string[];
  onToggle: (id: string) => void;
  graduated: Action[];
}) {
  const day = days.find((item) => item.key === selected) ?? days[0];

  return (
    <div className="screen-scroll">
      <div className="screen-lead">
        <h3>Your days</h3>
        <p>This is a record, not a score. A day counts when you check something off. Missing once is normal.</p>
      </div>

      <div className="week-days">
        {days.map((item) => (
          <button
            type="button"
            className={`week-day ${item.isToday ? "is-today" : ""} ${item.key === day?.key ? "is-selected" : ""}`}
            key={item.key}
            onClick={() => onSelect(item.key)}
            aria-pressed={item.key === day?.key}
          >
            {item.label}
            <span>{item.done ? `${item.done} of ${item.served} done` : "skipped"}</span>
          </button>
        ))}
      </div>

      {/* Clicking a day used to land on this screen and show nothing about
          that day. Now it shows what was actually on offer. */}
      <div className="week-detail">
        <strong>{day?.label ?? "Today"}</strong>
        {served.length === 0 ? (
          <p className="week-empty">Nothing was logged for this day.</p>
        ) : (
          <ul className="week-detail-list">
            {served.map((action) => {
              const isDone = done.includes(action.id);
              return (
                <li key={action.id} className={isDone ? "is-done" : ""}>
                  <button type="button" className="week-task" onClick={() => onToggle(action.id)} aria-pressed={isDone}>
                    <span className="week-detail-mark">{isDone && <Icon name="check" size={12} />}</span>
                    <span>{action.title}</span>
                    <span className="week-task-state">{isDone ? "Complete" : "Incomplete"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {graduated.length > 0 && (
        <>
          <div className="screen-lead">
            <h4>Off the list</h4>
            <p>Checked off {GRADUATE_AT} times, so they are now part of your routine.</p>
          </div>
          <div className="week-graduated">
            {graduated.map((action) => (
              <div className="week-graduate" key={action.id}>
                <span className="week-graduate-mark"><Icon name="sprout" size={14} /></span>
                {action.title}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type YearConversation = { date: string; msgs: { isUser: boolean; text: string }[] };

export function Year({ days, conversations = [], habits = [], today = new Date() }: {
  days: Record<string, string[]>;
  conversations?: YearConversation[];
  habits?: Habit[];
  today?: Date;
}) {
  const cells = useMemo(() => Array.from({ length: 365 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (364 - index));
    const key = dateKey(date);
    return { key, date, count: days[key]?.length ?? 0 };
  }), [days, today]);
  const [selectedKey, setSelectedKey] = useState(() => dateKey(today));
  const selected = cells.find((cell) => cell.key === selectedKey) ?? cells[cells.length - 1];
  const activeDays = cells.filter((cell) => cell.count > 0).length;
  const totalCompletions = cells.reduce((sum, cell) => sum + cell.count, 0);
  const bestStreak = cells.reduce((best, cell, index) => {
    if (cell.count === 0) return best;
    let length = 1;
    for (let cursor = index - 1; cursor >= 0 && cells[cursor].count > 0; cursor -= 1) length += 1;
    return Math.max(best, length);
  }, 0);
  const visibleKeys = useMemo(() => new Set(cells.map((cell) => cell.key)), [cells]);
  const visibleConversations = useMemo(() => conversations.filter((conversation) => visibleKeys.has(conversation.date)), [conversations, visibleKeys]);
  const conversationDays = new Set(visibleConversations.map((conversation) => conversation.date)).size;
  const messageCount = visibleConversations.reduce((sum, conversation) => sum + conversation.msgs.length, 0);
  const titles = new Map(habits.map((habit) => [habit.actionId ?? habit.id, habit.title]));
  const selectedConversations = conversations.filter((conversation) => conversation.date === selected.key);
  const selectedMessages = selectedConversations.reduce((sum, conversation) => sum + conversation.msgs.length, 0);
  const selectedTitles = (days[selected.key] ?? []).map((id) => titles.get(id)).filter((title): title is string => Boolean(title));
  const selectedLabel = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(selected.date);
  const monthStats = useMemo(() => {
    const groups = new Map<string, { key: string; year: number; baseLabel: string; active: number; completions: number }>();
    cells.forEach((cell) => {
      const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}`;
      const current = groups.get(key) ?? { key, year: cell.date.getFullYear(), baseLabel: new Intl.DateTimeFormat("en", { month: "short" }).format(cell.date), active: 0, completions: 0 };
      current.active += cell.count > 0 ? 1 : 0;
      current.completions += cell.count;
      groups.set(key, current);
    });
    const entries = [...groups.values()];
    const labelCounts = new Map<string, number>();
    entries.forEach((entry) => labelCounts.set(entry.baseLabel, (labelCounts.get(entry.baseLabel) ?? 0) + 1));
    return entries.map((entry) => ({ ...entry, label: (labelCounts.get(entry.baseLabel) ?? 0) > 1 ? `${entry.baseLabel} ${entry.year}` : entry.baseLabel }));
  }, [cells]);

  return (
    <div className="screen-scroll year-screen">
      <div className="screen-lead">
        <h3>Your year</h3>
        <p>See the days you showed up, then click any square to see what you logged.</p>
      </div>
      <div className="year-stats" aria-label="Year summary">
        <div className="year-stat"><strong>{activeDays}</strong><span>days with a completion</span></div>
        <div className="year-stat"><strong>{totalCompletions}</strong><span>habits checked off</span></div>
        <div className="year-stat"><strong>{bestStreak}</strong><span>day best streak</span></div>
        <div className="year-stat"><strong>{messageCount}</strong><span>messages across {conversationDays} days</span></div>
      </div>
      <div className="year-layout">
        <div className="year-grid-wrap">
          <div className="year-grid-heading"><strong>Last 365 days</strong><span>Light means a quieter day</span></div>
          <div className="year-grid" aria-label="365 day completion grid">
            {cells.map((cell) => (
              <button
                type="button"
                key={cell.key}
                className={`year-cell level-${Math.min(cell.count, 3)} ${cell.key === selected.key ? "is-selected" : ""}`}
                onClick={() => setSelectedKey(cell.key)}
                aria-label={`${cell.key}, ${cell.count} ${cell.count === 1 ? "completion" : "completions"}`}
                aria-pressed={cell.key === selected.key}
                title={`${cell.key}: ${cell.count} ${cell.count === 1 ? "completion" : "completions"}`}
              />
            ))}
          </div>
          <div className="year-legend" aria-hidden="true"><span>None</span><i className="level-0" /><i className="level-1" /><i className="level-2" /><i className="level-3" /><span>3+</span></div>
        </div>
        <aside className="year-detail" aria-live="polite">
          <span className="year-detail-kicker">Selected day</span>
          <h4>{selectedLabel}</h4>
          {selected.count > 0 ? <>
            <strong>{selected.count} {selected.count === 1 ? "completion" : "completions"}</strong>
            {selectedTitles.length > 0 && <ul>{selectedTitles.map((title) => <li key={title}>{title}</li>)}</ul>}
          </> : <p>No habits checked off.</p>}
          <p className="year-detail-messages">{selectedMessages ? `${selectedMessages} ${selectedMessages === 1 ? "message" : "messages"} that day.` : "No conversation that day."}</p>
        </aside>
      </div>
      <div className="year-months" aria-label="Monthly totals">
        {monthStats.map((month) => <div className="year-month" key={month.key}><strong>{month.label}</strong><span>{month.active} active days</span><span>{month.completions} check{month.completions === 1 ? "" : "s"}</span></div>)}
      </div>
    </div>
  );
}

export function Habits({ habits, actions, onAdd, onRename, onReorder, onTogglePause, onDelete }: {
  habits: Habit[];
  actions: Action[];
  onAdd: (action: Action) => void;
  onRename: (id: string, title: string) => void;
  onReorder: (id: string, direction: -1 | 1) => void;
  onTogglePause: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [customTitle, setCustomTitle] = useState("");
  const available = actions.filter((action) => !habits.some((habit) => habit.actionId === action.id));
  const addCustom = () => {
    const title = customTitle.trim();
    if (!title) return;
    onAdd({ id: `custom-${Date.now()}`, kicker: "Custom habit", title, body: title, short: title });
    setCustomTitle("");
  };
  return (
    <div className="screen-scroll">
      <div className="screen-lead"><h3>Habits</h3><p>Keep the practices that matter in the order that works for you. Pause one when life changes.</p></div>
      <div className="habit-stack">
        {habits.map((habit, index) => (
          <div className={`habit-row ${habit.paused ? "is-paused" : ""}`} key={habit.id}>
            <input aria-label={`Rename ${habit.title}`} value={habit.title} onChange={(event) => onRename(habit.id, event.target.value)} />
            <div className="habit-actions">
              <button type="button" className="btn btn-secondary" onClick={() => onReorder(habit.id, -1)} disabled={index === 0}>Up</button>
              <button type="button" className="btn btn-secondary" onClick={() => onReorder(habit.id, 1)} disabled={index === habits.length - 1}>Down</button>
              <button type="button" className="btn btn-secondary" onClick={() => onTogglePause(habit.id)}>{habit.paused ? "Resume" : "Pause"}</button>
              <button type="button" className="btn btn-secondary" onClick={() => onDelete(habit.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <div className="habit-add"><strong>Add a habit</strong><div>{available.slice(0, 6).map((action) => <button type="button" className="btn btn-secondary" key={action.id} onClick={() => onAdd(action)}>+ {action.title}</button>)}</div><div className="habit-custom"><input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addCustom(); }} placeholder="Name a habit" aria-label="New habit name" /><button type="button" className="btn btn-primary" onClick={addCustom} disabled={!customTitle.trim()}>Add</button></div></div>
    </div>
  );
}

export function Settings({ fontSize, onFontSize, syncPreferences, onSyncPreferences, accountLabel = "Account", onSignOut }: { fontSize: "small" | "medium" | "large"; onFontSize: (size: "small" | "medium" | "large") => void; syncPreferences: SyncPreferences; onSyncPreferences: (next: SyncPreferences) => void; accountLabel?: string; onSignOut?: () => void }) {
  return (
    <div className="screen-scroll">
      <div className="screen-lead"><h3>Settings</h3><p>Adjust GoodLife to suit the way you use it.</p></div>
      <div className="settings-card"><strong>Font size</strong><div className="settings-options">{(["small", "medium", "large"] as const).map((size) => <button type="button" key={size} className={`btn btn-secondary ${fontSize === size ? "is-selected" : ""}`} onClick={() => onFontSize(size)} aria-pressed={fontSize === size}>{size[0].toUpperCase() + size.slice(1)}</button>)}</div></div>
      <div className="settings-card column"><strong>Account sync</strong><p>The AI never syncs. Choose which account details to share.</p><div className="sync-options">{(["profile", "habits", "completions", "settings", "conversations"] as const).map((key) => <label className="auth-check" key={key}><input type="checkbox" checked={syncPreferences[key]} onChange={(event) => onSyncPreferences({ ...syncPreferences, [key]: event.target.checked })} /> {key === "conversations" ? "Conversations for seven days" : key[0].toUpperCase() + key.slice(1)}</label>)}</div></div>
      <div className="settings-card"><strong>Account</strong><p>{accountLabel} · synced securely across signed-in devices.</p>{onSignOut && <button type="button" className="btn btn-secondary" onClick={onSignOut}>Sign out</button>}</div>
    </div>
  );
}
