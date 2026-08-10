"use client";

import { useState } from "react";
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
        <p>These are prompts to test, not rules to obey. If one doesn&apos;t fit your life, that&apos;s useful information too.</p>
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

export function YourData({ profile, onFinishProfile, status, progress, onToggleModel, onExport, onClear, cloudClearPending = false }: {
  profile: Profile | null;
  onFinishProfile: (next: Profile) => void;
  status: ModelStatus;
  progress: number;
  onToggleModel: () => void;
  onExport: () => void;
  onClear: () => void;
  cloudClearPending?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const buttonLabel = status === "ready" ? "Delete the download" : status === "loading" ? "Downloading" : status === "error" ? "Try again" : "Download the model";

  return (
    <div className="screen-scroll">
      {!profile && <FirstRun profile={profile} onFinish={onFinishProfile} />}
      <div className="screen-lead" style={{ maxWidth: 700 }}>
        <h3>Your data</h3>
        <p>Your model and AI work stay on this device. Your profile, habits, completions and settings sync to your account. Conversations are deleted after seven days.</p>
      </div>

      <div className="data-stack">
        {cloudClearPending && <p className="auth-message" role="status">Local data is cleared. The online copy will be deleted as soon as this device reconnects.</p>}
        <div className="data-card">
          <div className="data-text">
            <span className="data-title">Export everything as JSON</span>
              <span className="data-sub">One file: profile, habits, completions and conversation history.</span>
          </div>
          <button type="button" className="btn btn-primary" onClick={onExport}>Download</button>
        </div>

        <div className="data-card column">
          <div className="data-card-top">
            <div className="data-text" style={{ maxWidth: 520 }}>
              <span className="data-title">The local AI coach</span>
              <span className="data-sub">Qwen2.5 1.5B, quantized, running in your browser through WebGPU. About a 1.6 GB download, once per browser profile. Conversation needs it, so there&apos;s no coach until it&apos;s here. Your actions, habits and ideas all work without it. Deleting the download frees the disk space and turns conversation back off.</span>
            </div>
            <button type="button" className="btn btn-secondary" onClick={onToggleModel} disabled={status === "loading" || status === "unsupported"}>{buttonLabel}</button>
          </div>
          {status === "loading" && <div className="data-progress"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
          <div className={`data-status ${status === "ready" ? "" : status === "error" || status === "unsupported" ? "is-error" : "is-off"}`}>
            <i />
            {status === "loading" ? `${MODEL_STATUS.loading}, ${Math.round(progress * 100)}%` : MODEL_STATUS[status]}
          </div>
        </div>

        <div className="data-danger">
          <div className="data-text">
            <span className="data-title">Start over</span>
            <span className="data-sub">{armed ? "This clears your good day, your plans, your streak and the whole thread. There's no undo, so export first if you might want it." : "Deletes the profile and history on this device. It can't be undone."}</span>
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
        <p>A returning streak, not a score. A day counts once you check anything off, and one miss is just a Tuesday.</p>
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
            <p>Checked off {GRADUATE_AT} times, so they stopped being suggestions. That&apos;s the point of the streak.</p>
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

export function Year({ days, today = new Date() }: { days: Record<string, string[]>; today?: Date }) {
  const cells = Array.from({ length: 365 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (364 - index));
    const key = dateKey(date);
    return { key, count: days[key]?.length ?? 0 };
  });
  return (
    <div className="screen-scroll">
      <div className="screen-lead"><h3>Your year</h3><p>A quiet view of the last 365 days. This grid is read-only; your day and week are where you make changes.</p></div>
      <div className="year-grid" aria-label="365 day completion grid">
        {cells.map((cell) => <span key={cell.key} className={`year-cell level-${Math.min(cell.count, 3)}`} title={`${cell.key}: ${cell.count} complete`} aria-label={`${cell.key}, ${cell.count} complete`} />)}
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
      <div className="screen-lead"><h3>Habits</h3><p>Keep the practices that matter, in the order that makes sense for your life. Pause one when the season changes.</p></div>
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
      <div className="screen-lead"><h3>Settings</h3><p>Small choices that make GoodLife fit the way you use it.</p></div>
      <div className="settings-card"><strong>Font size</strong><div className="settings-options">{(["small", "medium", "large"] as const).map((size) => <button type="button" key={size} className={`btn btn-secondary ${fontSize === size ? "is-selected" : ""}`} onClick={() => onFontSize(size)} aria-pressed={fontSize === size}>{size[0].toUpperCase() + size.slice(1)}</button>)}</div></div>
      <div className="settings-card column"><strong>Account sync</strong><p>The AI never syncs. Choose which account details do.</p><div className="sync-options">{(["profile", "habits", "completions", "settings", "conversations"] as const).map((key) => <label className="auth-check" key={key}><input type="checkbox" checked={syncPreferences[key]} onChange={(event) => onSyncPreferences({ ...syncPreferences, [key]: event.target.checked })} /> {key === "conversations" ? "Conversations for seven days" : key[0].toUpperCase() + key.slice(1)}</label>)}</div></div>
      <div className="settings-card"><strong>Account</strong><p>{accountLabel} · synced securely across signed-in devices.</p>{onSignOut && <button type="button" className="btn btn-secondary" onClick={onSignOut}>Sign out</button>}</div>
    </div>
  );
}
