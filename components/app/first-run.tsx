"use client";

import { useState } from "react";
import { Dandelion } from "@/components/marks";
import { CHECK_LEVELS, CHECK_ROWS, PRIORITIES, emptyProfile, type CheckKey, type CheckLevel, type Priority, type Profile } from "@/lib/advice";

const QUESTIONS = [
  {
    title: "Describe a good day",
    sub: "Think of a normal day you would be glad to repeat. We will use it as a reference later.",
  },
  {
    title: "What matters most right now?",
    sub: "Pick up to three. Keeping the list short makes it easier to follow.",
  },
  {
    title: "How's each of these going, honestly?",
    sub: "There is no score. This helps make today's three steps fit your life.",
  },
];

const COUNT_WORDS = ["None", "One", "Two", "Three"];
const COUNT_NOTES = ["", "One is enough to start.", "Two is enough to start.", "Three is the limit so the plan stays manageable."];

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
        <span className="screen-meta">Nothing here leaves this device</span>
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
