"use client";

import { useEffect, useRef, useState } from "react";
import { Dandelion, Icon } from "@/components/marks";
import type { Action } from "@/lib/advice";
import type { Message } from "@/lib/storage";

export function CoachMessage({ text, note, typing }: { text: string; note?: string; typing?: boolean }) {
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
      </div>
    </div>
  );
}

export function MessageList({ msgs }: { msgs: Message[] }) {
  return (
    <>
      {msgs.map((msg, index) => (msg.isUser
        ? <div className="msg-user" key={index}>{msg.text}</div>
        : <CoachMessage key={index} text={msg.text} note={msg.note} />
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

export function PlanCard({ actions, done, onToggle, onAsk }: { actions: Action[]; done: string[]; onToggle: (id: string) => void; onAsk: (text: string) => void }) {
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
          <button type="button" key={text} className="btn btn-secondary" onClick={() => onAsk(text)}>{text}</button>
        ))}
      </div>
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
