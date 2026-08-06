import assert from "node:assert/strict";
import test from "node:test";
import { CHECK_ROWS, PRIORITIES, classifyMessage, coachReply, getDailyActions, getFirstWeekPlan, isModelSafe, noteFor, normalizeCoachText } from "../lib/advice.ts";

const profile = {
  goodDay: "slow breakfasts and energy for a walk",
  priorities: ["Energy", "Money"],
  checks: { energy: "Shaky", money: "Rough", sleep: "Rough", social: "Fine" },
};

const EM_DASH = new RegExp(String.fromCodePoint(0x2014));

test("crisis language is classified before ordinary advice", () => {
  for (const phrase of ["I want to die", "I overdosed", "I wish I were dead", "I can't go on", "I want to hurt myself"]) {
    assert.equal(classifyMessage(phrase), "crisis");
    assert.match(coachReply(phrase, profile), /988|emergency/i);
    assert.equal(isModelSafe(classifyMessage(phrase)), false);
    assert.match(noteFor("crisis", "fixed"), /never goes to the model/i);
  }
});

test("high-stakes domains stay on deterministic guidance", () => {
  for (const domain of ["crisis", "money", "health", "housing"]) assert.equal(isModelSafe(domain), false);
  for (const domain of ["general", "habits", "relationships", "meaning"]) assert.equal(isModelSafe(domain), true);

  assert.equal(classifyMessage("Should I buy an ETF?"), "money");
  assert.match(coachReply("Should I buy an ETF?", profile), /no guarantees/i);
  assert.equal(classifyMessage("Is renting right for me?"), "housing");
  assert.match(coachReply("Is renting right for me?", profile), /flexibility/i);
  assert.equal(classifyMessage("I am tired and cannot sleep"), "health");
  assert.match(coachReply("Bedtime keeps slipping", profile), /wake time/i);
});

test("every reply carries a routing note, and the note says where it came from", () => {
  assert.match(noteFor("money", "fixed"), /fixed guidance/i);
  assert.match(noteFor("general", "model"), /local model/i);
  assert.match(noteFor("general", "model-off"), /isn't running/i);
  assert.match(noteFor("general", "model-failed"), /didn't finish/i);
  for (const domain of ["crisis", "money", "health", "housing", "habits", "general"]) {
    assert.ok(noteFor(domain, "fixed").length > 0);
  }
});

test("the day's three are ranked from the answers, roughest first", () => {
  const actions = getDailyActions(profile);
  assert.equal(actions.length, 3);
  assert.deepEqual(actions.map((action) => action.title), ["Pick one sleep anchor", "Set aside a little on payday", "Get outside before noon"]);
  assert.deepEqual(actions.map((action) => action.kicker), ["Energy · 1 min", "Money · 10 min", "Energy · 15 min"]);

  const settled = getDailyActions({ goodDay: "", priorities: ["Cooking"], checks: { energy: "Fine", money: "Fine", sleep: "Fine", social: "Fine" } });
  assert.equal(settled.length, 3);
  assert.equal(settled[0].title, "Pick one meal you can repeat");
  assert.equal(new Set(settled.map((action) => action.id)).size, 3);
});

test("the plan and the replies use plain copy with no em dashes", () => {
  const copy = [
    ...getDailyActions(profile).map((action) => `${action.kicker} ${action.title} ${action.body} ${action.short}`),
    ...getFirstWeekPlan(profile).map((step) => step.action),
    coachReply("Is renting right for me?", profile),
    coachReply("How should I think about money?", profile),
    coachReply("I can't stick with a habit", profile),
    coachReply("I'm anxious and stressed", profile),
    coachReply("What should I do?", profile),
  ].join(" ");
  assert.doesNotMatch(copy, EM_DASH);
  assert.doesNotMatch(copy, /not just|it(?:'|’)s important to note|delve|crucial/i);
  assert.doesNotMatch(copy, /!/);

  assert.equal(getFirstWeekPlan(profile).length, 7);
  assert.equal(normalizeCoachText(`Pause ${String.fromCodePoint(0x2014)} then continue`), "Pause, then continue");
  assert.equal(normalizeCoachText(`Pause${String.fromCodePoint(0x2014)}then continue`), "Pause, then continue");
});

test("the first-run questions match the three-step redesign", () => {
  assert.equal(PRIORITIES.length, 8);
  assert.deepEqual(PRIORITIES.slice(0, 3), ["Energy", "Money", "Sleep"]);
  assert.deepEqual(CHECK_ROWS.map((row) => row.key), ["energy", "money", "sleep", "social"]);
  assert.equal(CHECK_ROWS[1].label, "Money, month to month");
});
