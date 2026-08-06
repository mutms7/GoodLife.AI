"use client";

import { useState } from "react";
import { Dandelion, Icon } from "@/components/marks";
import { classifyMessage, coachReply, emptyProfile, isModelSafe, noteFor } from "@/lib/advice";
import type { Message } from "@/lib/storage";

const OPENING: Message = { isUser: false, text: "Tell me what's been getting in the way lately. I'll keep my answer small enough to try today." };
const SUGGESTIONS = ["Bedtime keeps slipping", "Where do I start with savings?"];

/** The demo answers for real, using the same classifier and the same fixed
 *  guidance the app uses. It never loads the model, and the note says so. */
function reply(text: string): Message {
  const domain = classifyMessage(text);
  const note = isModelSafe(domain)
    ? "Fixed guidance here. In the app this one can go to the local model."
    : noteFor(domain, "fixed");
  return { isUser: false, text: coachReply(text, emptyProfile), note };
}

export function CoachDemo() {
  const [msgs, setMsgs] = useState<Message[]>([OPENING]);
  const [draft, setDraft] = useState("");

  const send = (text: string) => {
    const message = text.trim();
    if (!message) return;
    setDraft("");
    setMsgs((current) => [...current, { isUser: true, text: message }, reply(message)]);
  };

  return (
    <div className="demo">
      <div className="demo-head">
        <strong>Try the coach right here</strong>
        <span><i />nothing is being uploaded</span>
      </div>
      <div className="demo-body">
        <div className="demo-thread">
          {msgs.map((msg, index) => (msg.isUser ? (
            <div className="msg-user" key={index}>{msg.text}</div>
          ) : (
            <div className="msg-coach" key={index}>
              <span className="coach-avatar"><Dandelion size={14} strokeWidth={1.7} /></span>
              <div className="msg-coach-body">
                <div className="msg-text">{msg.text}</div>
                {msg.note && <div className="msg-note">{msg.note}</div>}
              </div>
            </div>
          )))}
        </div>
        <div className="demo-suggestions">
          {SUGGESTIONS.map((text) => <button type="button" key={text} onClick={() => send(text)}>{text}</button>)}
        </div>
        <div className="demo-composer">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); send(draft); } }}
            placeholder="Type something that's been bugging you"
            aria-label="Message the coach"
          />
          <button type="button" className="btn btn-send" onClick={() => send(draft)} disabled={!draft.trim()} aria-label="Send">
            <Icon name="arrow-up" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
