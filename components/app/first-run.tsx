"use client";

import { useState } from "react";
import { Dandelion } from "@/components/marks";
import { CHECK_LEVELS, CHECK_ROWS, PRIORITIES, emptyProfile, type CheckKey, type CheckLevel, type Priority, type Profile } from "@/lib/advice";

const QUESTIONS = [
  {
    title: "Describe a good day. The ordinary kind.",
    sub: "Not the holiday version. A Tuesday you'd be glad to repeat. Whatever you write here is the thing I'll keep pointing back to.",
  },
  {
    title: "What matters most right now?",
    sub: "Pick up to three. Three is the limit because everything can't be first, and I'd rather you make progress on a few things than a list of nine.",
  },
  {
    title: "How's each of these going, honestly?",
    sub: "No scoring, no streak riding on it. I just need to know where things are stuck so today's three aren't generic.",
  },
];

const COUNT_WORDS = ["None", "One", "Two", "Three"];
const COUNT_NOTES = ["", "One is a fine place to start. I'd rather your plan be short than tidy.", "You can leave it at two. I'd rather your plan be short than tidy.", "That's the cap, and it's on purpose. I'd rather your plan be short than tidy."];

export function FirstRun({ profile, onFinish }: { profile: Profile | null; onFinish: (next: Profile) => void }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Profile>(profile ?? emptyProfile);

  const setCheck = (key: CheckKey, level: CheckLevel) => setDraft((current) => ({ ...current, checks: { ...current.checks, [key]: level } }));
  const togglePriority = (priority: Priority) => setDraft((current) => {
    if (current.priorities.includes(priority)) return { ...current, priorities: current.priorities.filter((item) => item !== priority) };
    // A fourth pick is refused quietly. The cap is stated in the question.
    if (current.priorities.length >= 3) return current;
    return { ...current, priorities: [...current.priorities, priority] };
  });

  const question = QUESTIONS[step - 1];

  return (
    <div className="screen">
      <div className="screen-header">
        <span className="screen-meta">Step {step} of 3</span>
        <span className="screen-meta">Nothing here leaves your browser</span>
      </div>

      <div className="run-body">
        <div className="run-question">
          <span className="run-mark"><Dandelion size={24} strokeWidth={1.4} /></span>
          <div className="run-copy">
            <h3>{question.title}</h3>
            <p>{question.sub}</p>
          </div>
        </div>

        <div className="run-input">
          {step === 1 && (
            <div className="run-field">
              <textarea
                value={draft.goodDay}
                onChange={(event) => setDraft({ ...draft, goodDay: event.target.value })}
                placeholder="I wake up without an alarm fight, walk before I open my laptop, and money isn't the thing I'm avoiding thinking about."
                aria-label="Describe a good day"
              />
              <p className="run-help">A couple of sentences is plenty. You can rewrite it any time.</p>
            </div>
          )}

          {step === 2 && (
            <div className="run-pills">
              {PRIORITIES.map((priority) => {
                const on = draft.priorities.includes(priority);
                return (
                  <button type="button" key={priority} className={`run-pill ${on ? "is-on" : ""}`} onClick={() => togglePriority(priority)} aria-pressed={on}>
                    {priority}
                  </button>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="run-rows">
              {CHECK_ROWS.map((row) => (
                <div className="run-row" key={row.key}>
                  <span id={`check-${row.key}`}>{row.label}</span>
                  <div className="run-seg" role="group" aria-labelledby={`check-${row.key}`}>
                    {CHECK_LEVELS.map((level) => (
                      <button type="button" key={level} className={draft.checks[row.key] === level ? "is-on" : ""} onClick={() => setCheck(row.key, level)} aria-pressed={draft.checks[row.key] === level}>
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {step === 2 && draft.priorities.length > 0 && (
          <div className="run-note">
            <strong>{COUNT_WORDS[draft.priorities.length]} picked</strong>
            <span>{COUNT_NOTES[draft.priorities.length]}</span>
          </div>
        )}
      </div>

      <div className="run-foot">
        <button type="button" className="btn btn-ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>Back</button>
        <div className="run-foot-right">
          <span className="run-hint">You can skip anything and fix it later</span>
          <button type="button" className="btn btn-primary btn-pill" onClick={() => (step < 3 ? setStep(step + 1) : onFinish(draft))}>
            {step === 3 ? "Show me my three" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
