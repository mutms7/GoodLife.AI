import assert from "node:assert/strict";
import test from "node:test";
import { CHECK_ROWS, PRIORITIES, PRIORITIES as ALL_PRIORITIES, getDailyActions, getWeekPlan, normalizeCoachText, rankActions } from "../lib/advice.ts";

const profile = {
  goodDay: "slow breakfasts and energy for a walk",
  priorities: ["Energy", "Money"],
  checks: { energy: "Shaky", money: "Rough", sleep: "Rough", social: "Fine" },
};

const EM_DASH = new RegExp(String.fromCodePoint(0x2014));

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

/** Every action in the pool, not just today's three, reached by asking for a
 *  profile that wants each priority in turn. */
function wholePool() {
  const everything = new Map();
  for (const priority of ALL_PRIORITIES) {
    const wants = { goodDay: "", priorities: [priority], checks: { energy: "Rough", money: "Rough", sleep: "Rough", social: "Rough" } };
    for (const action of rankActions(wants)) everything.set(action.id, action);
  }
  return [...everything.values()];
}

test("the whole action pool uses plain language with no em dashes", () => {
  const pool = wholePool();
  assert.ok(pool.length >= 18, `the pool is only ${pool.length} deep`);

  const copy = [
    ...pool.map((action) => `${action.kicker} ${action.title} ${action.body} ${action.short}`),
    ...getWeekPlan(pool[0]).map((step) => step.action),
  ].join(" ");
  assert.doesNotMatch(copy, EM_DASH);
  assert.doesNotMatch(copy, /not just|it(?:'|’)s important to note|delve|crucial/i);
  assert.doesNotMatch(copy, /!/);

  // Every action needs both lengths, since the phone layout swaps one for the other.
  for (const action of pool) {
    assert.ok(action.short.length > 0, `${action.id} has no short line`);
    assert.ok(action.body.length > action.short.length, `${action.id} short line isn't shorter`);
    assert.match(action.kicker, /·/, `${action.id} kicker is missing its time`);
  }

  assert.equal(getWeekPlan(pool[0]).length, 7);
  assert.equal(normalizeCoachText(`Pause ${String.fromCodePoint(0x2014)} then continue`), "Pause, then continue");
  assert.equal(normalizeCoachText(`Pause${String.fromCodePoint(0x2014)}then continue`), "Pause, then continue");
});

test("the first-run questions match the three-step redesign", () => {
  assert.equal(PRIORITIES.length, 8);
  assert.deepEqual(PRIORITIES.slice(0, 3), ["Energy", "Money", "Sleep"]);
  assert.deepEqual(CHECK_ROWS.map((row) => row.key), ["energy", "money", "sleep", "social"]);
  assert.equal(CHECK_ROWS[1].label, "Money, month to month");
});
