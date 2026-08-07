"use client";

import { useState } from "react";
import { Dandelion, Icon } from "@/components/marks";
import { DEMO_DEFERRAL, DEMO_EXCHANGES } from "@/lib/demo";
import type { Message } from "@/lib/storage";

const OPENING: Message = { isUser: false, text: "Tell me what's been getting in the way lately. Pick one and I'll show you the shape of the answer." };

/** Clicking a sample shows what that exchange looks like. Anything typed by
 *  hand gets the truth: this page has no model, so it can't answer. */
function reply(text: string): Message {
  const match = DEMO_EXCHANGES.find((exchange) => exchange.ask.toLowerCase() === text.trim().toLowerCase());
  return { isUser: false, ...(match ?? DEMO_DEFERRAL) };
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
        <strong>See the shape of an answer</strong>
        <span><i />written samples, nothing uploaded</span>
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
          {DEMO_EXCHANGES.map((exchange) => <button type="button" key={exchange.ask} onClick={() => send(exchange.ask)}>{exchange.ask}</button>)}
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
