"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dandelion, Icon } from "@/components/marks";
import type { Action } from "@/lib/advice";
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

const SUGGESTIONS = ["Too much for today", "Why the money one?", "Bedtime keeps slipping"];

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

export function PlanCard({ actions, done, onToggle, onAsk, canAsk }: { actions: Action[]; done: string[]; onToggle: (id: string) => void; onAsk: (text: string) => void; canAsk: boolean }) {
  const phone = usePhone();
  return (
    <div className="plan-card">
      {actions.map((action) => {
        const isDone = done.includes(action.id);
        return (
          <button type="button" key={action.id} className={`plan-row ${isDone ? "is-done" : ""}`} onClick={() => onToggle(action.id)} aria-pressed={isDone}>
            <span className="plan-check">{isDone && <Icon name="check" size={13} />}</span>
            <span className="plan-text">
              {!phone && <span className="plan-kicker">{action.kicker}</span>}
              <span className="plan-title">{action.title}</span>
              {!(phone && isDone) && <span className="plan-body">{phone ? action.short : action.body}</span>}
            </span>
          </button>
        );
      })}
      <div className="plan-footer">
        {SUGGESTIONS.map((text) => (
          <button type="button" key={text} className="btn btn-secondary" onClick={() => onAsk(text)} disabled={!canAsk}>{text}</button>
        ))}
      </div>
    </div>
  );
}

const GATE_COPY: Record<Exclude<ModelStatus, "ready">, { title: string; body: string; action: string | null }> = {
  off: {
    title: "Download the coach to start talking",
    body: `The coach is ${MODEL_LABEL}, and it runs on your device rather than on a server. That means the download comes first: ${MODEL_DOWNLOAD_LABEL}, once per browser, then it's cached. Your three actions above work without it.`,
    action: "Download the coach",
  },
  loading: {
    title: "Getting the coach ready",
    body: "The weights are downloading into this browser's cache. You can leave this tab open and come back to it.",
    action: null,
  },
  error: {
    title: "The coach didn't load",
    body: "That can happen if the download was interrupted or the GPU refused the model. Nothing was sent anywhere, so trying again is free.",
    action: "Try again",
  },
  unsupported: {
    title: "This browser can't run the coach",
    body: "Conversation needs WebGPU, and this browser doesn't offer it. A recent Chrome, Edge or Safari on a machine with a GPU will work. Your three actions and the seven-day plan still work here.",
    action: null,
  },
};

/** The chat is gated on the model. There is no fixed-guidance chat behind it,
 *  so this replaces the composer rather than sitting next to it. */
export function ModelGate({ status, progress, onStart }: { status: Exclude<ModelStatus, "ready">; progress: number; onStart: () => void }) {
  const copy = GATE_COPY[status];
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
        {status === "loading" && <span className="model-gate-pct">{Math.round(progress * 100)}%</span>}
      </div>
      <p className="composer-note">
        If you need urgent help right now, don&apos;t wait for a download. Contact your local emergency number, or call or text 988 in Canada and the US.
      </p>
    </div>
  );
}

export function Composer({ draft, setDraft, onSend, status, busy }: { draft: string; setDraft: (value: string) => void; onSend: () => void; status: string; busy: boolean }) {
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
          <button type="button" className="btn btn-send" onClick={onSend} disabled={busy || !draft.trim()} aria-label="Send">
            <Icon name="arrow-up" size={16} />
          </button>
        </div>
      </div>
      <p className="composer-note">A reflection tool, not medical, legal or financial advice.</p>
    </div>
  );
}

/** Keeps the newest message in view when one arrives. */
export function useScrollToLatest(dependency: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [dependency]);
  return ref;
}
