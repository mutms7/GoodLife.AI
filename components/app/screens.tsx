"use client";

import { useState } from "react";
import { Icon } from "@/components/marks";
import { GRADUATE_AT, getWeekPlan, type Action } from "@/lib/advice";
import type { ModelStatus } from "@/lib/llm";
import type { RecentDay } from "@/lib/storage";

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

export function YourData({ status, progress, onToggleModel, onExport, onClear }: {
  status: ModelStatus;
  progress: number;
  onToggleModel: () => void;
  onExport: () => void;
  onClear: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const buttonLabel = status === "ready" ? "Delete the download" : status === "loading" ? "Downloading" : status === "error" ? "Try again" : "Download the model";

  return (
    <div className="screen-scroll">
      <div className="screen-lead" style={{ maxWidth: 700 }}>
        <h3>Your data</h3>
        <p>Your answers, your completions and every message live in this browser&apos;s storage. There&apos;s no GoodLife.AI server holding a copy, which also means clearing site data can wipe it. Export sometimes.</p>
      </div>

      <div className="data-stack">
        <div className="data-card">
          <div className="data-text">
            <span className="data-title">Export everything as JSON</span>
            <span className="data-sub">One file: profile, plans, streak, chat history.</span>
          </div>
          <button type="button" className="btn btn-primary" onClick={onExport}>Download</button>
        </div>

        <div className="data-card column">
          <div className="data-card-top">
            <div className="data-text" style={{ maxWidth: 520 }}>
              <span className="data-title">The local AI coach</span>
              <span className="data-sub">Qwen2.5 1.5B, quantized, running in your browser through WebGPU. About a 1.6 GB download, once per browser profile. Conversation needs it, so there&apos;s no coach until it&apos;s here. Your three actions, the seven-day plan and the ideas all work without it. Deleting the download frees the disk space and turns conversation back off.</span>
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

export function Week({ days, selected, onSelect, planAction, planDay, served, done, graduated }: {
  days: RecentDay[];
  selected: string;
  onSelect: (key: string) => void;
  planAction: Action | undefined;
  /** Zero-based index into the seven steps, or -1 before a plan starts. */
  planDay: number;
  served: Action[];
  done: string[];
  graduated: Action[];
}) {
  const day = days.find((item) => item.key === selected) ?? days[0];
  const plan = getWeekPlan(planAction);

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
            {served.map((action) => (
              <li key={action.id} className={done.includes(action.id) ? "is-done" : ""}>
                <span className="week-detail-mark">{done.includes(action.id) && <Icon name="check" size={12} />}</span>
                {action.title}
              </li>
            ))}
          </ul>
        )}
      </div>

      {planAction && (
        <>
          <div className="screen-lead">
            <h4>Seven days on {planAction.title.toLowerCase()}</h4>
            <p>{planDay >= 0 ? `You're on day ${planDay + 1}.` : "This starts once it's your first action of the day."} The sequence restarts whenever your top action changes.</p>
          </div>
          <div className="week-plan">
            {plan.map((step, index) => (
              <div className={`week-step ${index === planDay ? "is-current" : ""} ${index < planDay ? "is-past" : ""}`} key={step.day}>
                <strong>{step.day}</strong>
                <span>{step.action}</span>
              </div>
            ))}
          </div>
        </>
      )}

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
