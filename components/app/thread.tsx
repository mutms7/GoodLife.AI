"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dandelion, Icon } from "@/components/marks";
import { GRADUATE_AT, type Action } from "@/lib/advice";
import { MODEL_DOWNLOAD_LABEL, MODEL_LABEL, type ModelStatus } from "@/lib/llm";
import type { Message } from "@/lib/storage";

export function CoachMessage({ text, note, typing, children }: { text: string; note?: string; typing?: boolean; children?: ReactNode }) {
  return (
    <div className="msg-coach">
      <span className="coach-avatar"><Dandelion size={15} strokeWidth={1.6} /></span>
      <div className="msg-coach-body">
        {typing && !text ? (
          <span className="typing" aria-label="The coach is writing"><i /><i /><i /></span>
        ) : (
          <div className="msg-text">{text}</div>
        )}
        {note && <div className="msg-note">{note}</div>}
        {children}
      </div>
    </div>
  );
}

export function MessageList({ msgs, onRetry }: { msgs: Message[]; onRetry?: () => void }) {
  const last = msgs.length - 1;
  return (
    <>
      {msgs.map((msg, index) => (msg.isUser
        ? <div className="msg-user" key={index}>{msg.text}</div>
        : (
          <CoachMessage key={index} text={msg.text} note={msg.note}>
            {msg.retryable && index === last && onRetry && (
              <button type="button" className="btn btn-secondary msg-retry" onClick={onRetry}>Try again</button>
            )}
          </CoachMessage>
        )
      ))}
    </>
  );
}

/** The phone layout shortens each action to one line and drops the line
 *  entirely once the row is checked off. */
function usePhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return phone;
}

export function PlanCard({ actions, done, counts, onToggle, onSwap }: {
  actions: Action[];
  done: string[];
  counts: Record<string, number>;
  onToggle: (id: string) => void;
  onSwap: (id: string) => void;
}) {
  const phone = usePhone();
  return (
    <div className="plan-card">
      {actions.map((action) => {
        const isDone = done.includes(action.id);
        const soFar = counts[action.id] ?? 0;
        return (
          // A row is two controls, not one, so the swap button can't nest
          // inside the button that checks the row off.
          <div className={`plan-row ${isDone ? "is-done" : ""}`} key={action.id}>
            <button type="button" className="plan-main" onClick={() => onToggle(action.id)} aria-pressed={isDone}>
              <span className="plan-check">{isDone && <Icon name="check" size={13} />}</span>
              <span className="plan-text">
                {!phone && (
                  <span className="plan-kicker">
                    {action.kicker}
                    {soFar > 0 && <span className="plan-streak"> · {soFar} of {GRADUATE_AT} done</span>}
                  </span>
                )}
                <span className="plan-title">{action.title}</span>
                {!(phone && isDone) && <span className="plan-body">{phone ? action.short : action.body}</span>}
              </span>
            </button>
            <button
              type="button"
              className="plan-swap"
              onClick={() => onSwap(action.id)}
              aria-label={`Swap out ${action.title}`}
              title="Not today, show me another"
            >
              <Icon name="shuffle" size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

const GATE_COPY: Record<Exclude<ModelStatus, "ready">, { title: string; body: string; action: string | null }> = {
  off: {
    title: "Download the coach to start",
    body: `The ${MODEL_LABEL} coach runs on your device, not a server. Download ${MODEL_DOWNLOAD_LABEL} once per browser. Your actions above work without it.`,
    action: "Download the coach",
  },
  loading: {
    title: "Getting the coach ready",
    body: "The model is downloading into this browser. You can leave this tab open while it finishes.",
    action: null,
  },
  error: {
    title: "The coach didn't load",
    body: "The download may have stopped, or this device may have refused the model. Nothing was sent anywhere. Try again when you are ready.",
    action: "Try again",
  },
  unsupported: {
    title: "This browser cannot run the coach",
    body: "Conversation needs WebGPU, which this browser does not offer. Try a recent Chrome, Edge or Safari on a computer with a GPU. Your actions and history still work here.",
    action: null,
  },
};

const DESKTOP_GATE_COPY: Record<Exclude<ModelStatus, "ready">, { title: string; body: string; action: string | null }> = {
  off: {
    title: "Start the local SLM",
    body: `The ${MODEL_LABEL} coach is included with the Windows app. It runs on this computer and does not need to download again.`,
    action: "Start local SLM",
  },
  loading: {
    title: "Starting the local SLM",
    body: "The coach is loading from the model included with GoodLife.AI. Nothing is being downloaded from the internet.",
    action: null,
  },
  error: {
    title: "The local SLM did not start",
    body: "The model included with the app could not start on this computer. Nothing was sent anywhere. You can try again.",
    action: "Try again",
  },
  unsupported: {
    title: "This computer cannot run the coach",
    body: "Conversation needs WebGPU, which is not available here. Your actions and history still work.",
    action: null,
  },
};

/** The chat is gated on the model. There is no fixed-guidance chat behind it,
 *  so this replaces the composer rather than sitting next to it. */
export function ModelGate({ status, progress, onStart, desktop = false }: { status: Exclude<ModelStatus, "ready">; progress: number; onStart: () => void; desktop?: boolean }) {
  const copy = (desktop ? DESKTOP_GATE_COPY : GATE_COPY)[status];
  return (
    <div className="composer-wrap">
      <div className="model-gate">
        <div className="model-gate-text">
          <strong>{copy.title}</strong>
          <span>{copy.body}</span>
        </div>
        {status === "loading" && <div className="data-progress"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
        {copy.action && (
          <button type="button" className="btn btn-primary" onClick={onStart}>{copy.action}</button>
        )}
        {status === "loading" && <span className="model-gate-pct">{desktop ? `Starting, ${Math.round(progress * 100)}%` : `${Math.round(progress * 100)}%`}</span>}
      </div>
      <p className="composer-note">
        If you need urgent help right now, don&apos;t wait for the coach to start. Contact your local emergency number, or call or text 988 in Canada and the US.
      </p>
    </div>
  );
}

export function Composer({ draft, setDraft, onSend, onStop, status, busy }: { draft: string; setDraft: (value: string) => void; onSend: () => void; onStop: () => void; status: string; busy: boolean }) {
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const node = field.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [draft]);

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={field}
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          placeholder="Tell me how it's actually going"
          aria-label="Message your coach"
        />
        <div className="composer-foot">
          <span className="composer-status">{status}</span>
          {/* While it's writing, the same slot stops it. A reply you can't
              interrupt is the worst part of a slow on-device model. */}
          {busy ? (
            <button type="button" className="btn btn-send is-stop" onClick={onStop} aria-label="Stop generating">
              <Icon name="square" size={15} />
            </button>
          ) : (
            <button type="button" className="btn btn-send" onClick={onSend} disabled={!draft.trim()} aria-label="Send">
              <Icon name="arrow-up" size={16} />
            </button>
          )}
        </div>
      </div>
      <p className="composer-note">A reflection tool, not medical, legal or financial advice.</p>
    </div>
  );
}

/** How far from the bottom still counts as "following along". */
const STICK_TO_BOTTOM_PX = 120;

/** Keeps the newest message in view, unless you've scrolled up to reread
 *  something. Snapping back on every token made the thread unreadable while
 *  the model was writing. */
export function useScrollToLatest(dependency: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  const following = useRef(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onScroll = () => {
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      following.current = distance <= STICK_TO_BOTTOM_PX;
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (node && following.current) node.scrollTop = node.scrollHeight;
  }, [dependency]);

  return ref;
}
