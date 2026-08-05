import assert from "node:assert/strict";
import test from "node:test";
import { classifyMessage, coachReply, getAdviceStarts, getFirstWeekPlan, normalizeCoachText } from "../lib/advice.ts";

const profile = {
  name: "Maya",
  vision: "slow breakfasts and energy for a walk",
  priorities: ["energy", "money"],
  energy: "steady",
  time: "some",
  moneyFeel: "okay",
  debt: "none",
  emergency: "some",
  housing: "exploring",
  sleep: "okay",
  social: "weekly",
  outdoor: "weekly",
  cooking: "sometimes",
  meditation: "curious",
};

test("crisis language is classified before ordinary advice", () => {
  for (const phrase of ["I want to die", "I overdosed", "I wish I were dead", "I can't go on", "I want to hurt myself"]) {
    assert.equal(classifyMessage(phrase), "crisis");
    assert.match(coachReply(phrase, profile), /988|emergency/i);
  }
});

test("high-stakes domains stay on deterministic guidance", () => {
  assert.equal(classifyMessage("Should I buy an ETF?"), "money");
  assert.match(coachReply("Should I buy an ETF?", profile), /no guarantees/i);
  assert.equal(classifyMessage("Is renting right for me?"), "housing");
  assert.match(coachReply("Is renting right for me?", profile), /flexibility/i);
  assert.equal(classifyMessage("I am tired and cannot sleep"), "health");
});

test("starting points and replies use plain, conversational copy", () => {
  const starts = getAdviceStarts(profile);
  assert.equal(starts.length, 3);
  assert.match(starts[0].action, /you can keep|choose|set|pick/i);
  assert.doesNotMatch(starts.map((start) => `${start.title} ${start.why} ${start.action}`).join(" "), new RegExp(String.fromCodePoint(0x2014)));
  assert.match(getFirstWeekPlan(profile)[1].action, /two minutes/i);
  assert.match(coachReply("What should I do?", profile), /don't|do not/i);
  const replies = [
    coachReply("Is renting right for me?", profile),
    coachReply("How should I think about money?", profile),
    coachReply("I can't stick with a habit", profile),
    coachReply("I'm anxious and stressed", profile),
  ].join(" ");
  assert.doesNotMatch(replies, /not just|it(?:'|’)s important to note/i);
  assert.equal(normalizeCoachText(`Pause ${String.fromCodePoint(0x2014)} then continue`), "Pause, then continue");
  assert.equal(normalizeCoachText(`Pause${String.fromCodePoint(0x2014)}then continue`), "Pause, then continue");
});
