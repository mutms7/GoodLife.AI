import assert from "node:assert/strict";
import test from "node:test";
import { GRADUATE_AT, actionsServedOn, completionCounts, completionCountsBefore, getAction, getDailyActions, getWeekPlan, graduatedActions, hasGraduated, planDayIndex, rankActions } from "../lib/advice.ts";
import { dateKey, daysBetween, recentDays, shiftDays, streakFrom } from "../lib/days.ts";

const profile = {
  goodDay: "slow breakfasts and energy for a walk",
  priorities: ["Energy", "Money"],
  checks: { energy: "Shaky", money: "Rough", sleep: "Rough", social: "Fine" },
};

test("the day's three still rank roughest first on a fresh profile", () => {
  const actions = getDailyActions(profile);
  assert.deepEqual(actions.map((action) => action.title), ["Pick one sleep anchor", "Set aside a little on payday", "Get outside before noon"]);
});

test("the candidate list is deep enough to survive graduation", () => {
  const ranked = rankActions(profile);
  // Deep enough that three swaps on a bad day don't hit the bottom of it.
  assert.ok(ranked.length >= 15, `only ${ranked.length} candidates`);
  assert.equal(new Set(ranked.map((action) => action.id)).size, ranked.length, "no duplicates");
});

test("sources are drawn round-robin, so one rough area can't take all three slots", () => {
  const allRough = { ...profile, priorities: [], checks: { energy: "Rough", money: "Rough", sleep: "Rough", social: "Rough" } };
  // Draining one source at a time would give sleep-anchor, softer-landing and
  // caffeine-curfew: three sleep actions and nothing about money or people.
  assert.deepEqual(
    getDailyActions(allRough).map((action) => action.id),
    ["sleep-anchor", "payday-transfer", "daylight-loop"],
  );

  // Once the heads graduate the next round comes up, still spread across
  // sources: the social line's head, a filler, then sleep's second.
  const graduated = { "sleep-anchor": GRADUATE_AT, "payday-transfer": GRADUATE_AT, "daylight-loop": GRADUATE_AT };
  assert.deepEqual(
    getDailyActions(allRough, graduated).map((action) => action.id),
    ["one-invitation", "two-minute-start", "softer-landing"],
  );
});

test("completion counts come off the day log", () => {
  const counts = completionCounts({
    "2026-08-01": ["sleep-anchor", "payday-transfer"],
    "2026-08-02": ["sleep-anchor"],
    "2026-08-03": ["sleep-anchor", "daylight-loop"],
  });
  assert.equal(counts["sleep-anchor"], 3);
  assert.equal(counts["payday-transfer"], 1);
  assert.equal(counts["daylight-loop"], 1);
  assert.equal(counts["never-touched"], undefined);
});

test("an action graduates after a fortnight of completions and stops being offered", () => {
  const counts = { "sleep-anchor": GRADUATE_AT };
  assert.equal(hasGraduated(counts, "sleep-anchor"), true);
  assert.equal(hasGraduated(counts, "payday-transfer"), false);

  const actions = getDailyActions(profile, counts);
  assert.ok(!actions.some((action) => action.id === "sleep-anchor"), "graduated action should be gone");
  assert.equal(actions.length, 3, "the slot is refilled, not left empty");

  assert.deepEqual(graduatedActions(counts).map((action) => action.id), ["sleep-anchor"]);
});

test("the three hold for two weeks, then turn over", () => {
  // Graduation is a fortnight because that's how long a repetition takes to
  // stick. So the list is supposed to be steady, and then move.
  const counts = {};
  const first = getDailyActions(profile).map((action) => action.id);

  for (let day = 0; day < GRADUATE_AT; day += 1) {
    const actions = getDailyActions(profile, counts);
    assert.deepEqual(actions.map((action) => action.id), first, `the three moved on day ${day + 1}`);
    for (const action of actions) counts[action.id] = (counts[action.id] ?? 0) + 1;
  }

  const after = getDailyActions(profile, counts);
  assert.equal(after.length, 3);
  assert.equal(after.filter((action) => first.includes(action.id)).length, 0, "all three should have graduated together");
});

test("the pool still has somewhere to go after several turnovers", () => {
  const counts = {};
  const seen = new Set();
  // Six months of checking off all three every single day.
  for (let day = 0; day < 180; day += 1) {
    const actions = getDailyActions(profile, counts);
    assert.equal(actions.length, 3, `day ${day + 1} came up short`);
    for (const action of actions) {
      seen.add(action.id);
      counts[action.id] = (counts[action.id] ?? 0) + 1;
    }
  }
  assert.ok(seen.size >= 15, `only ${seen.size} distinct actions in six months`);
});

test("a swapped action steps aside for today and the next one fills in", () => {
  const before = getDailyActions(profile);
  const after = getDailyActions(profile, {}, [before[0].id]);
  assert.equal(after.length, 3);
  assert.ok(!after.some((action) => action.id === before[0].id));
  assert.equal(after[0].id, before[1].id, "the rest shuffle up");
});

test("the pool never returns fewer than three, even fully graduated", () => {
  const everything = Object.fromEntries(rankActions(profile).map((action) => [action.id, GRADUATE_AT]));
  const actions = getDailyActions(profile, everything);
  assert.equal(actions.length, 3);
});

test("today's three don't shift as you check them off", () => {
  // The last tick used to graduate an action instantly, so the row vanished
  // out from under the check you had just earned. One short of the threshold:
  const days = {};
  for (let back = GRADUATE_AT; back >= 2; back -= 1) days[`2026-07-${String(30 - back).padStart(2, "0")}`] = ["sleep-anchor"];
  assert.equal(Object.keys(days).length, GRADUATE_AT - 1);

  const before = actionsServedOn(profile, days, {}, "2026-08-07");
  const afterTicking = actionsServedOn(profile, { ...days, "2026-08-07": ["sleep-anchor"] }, {}, "2026-08-07");
  assert.deepEqual(afterTicking.map((a) => a.id), before.map((a) => a.id), "the list is stable within the day");
  assert.ok(before.some((a) => a.id === "sleep-anchor"));

  // It graduates tomorrow instead.
  const tomorrow = actionsServedOn(profile, { ...days, "2026-08-07": ["sleep-anchor"] }, {}, "2026-08-08");
  assert.ok(!tomorrow.some((a) => a.id === "sleep-anchor"), "graduation lands the next day");
});

test("counts before a date ignore that day and everything after it", () => {
  const days = { "2026-08-05": ["a"], "2026-08-06": ["a", "b"], "2026-08-07": ["a"], "2026-08-09": ["a"] };
  assert.deepEqual(completionCountsBefore(days, "2026-08-07"), { a: 2, b: 1 });
  assert.deepEqual(completionCountsBefore(days, "2026-08-05"), {});
});

test("a past day's three can be recomputed exactly, so nothing is stored", () => {
  const days = { "2026-08-05": ["sleep-anchor", "payday-transfer"], "2026-08-06": ["sleep-anchor"] };
  const swaps = { "2026-08-06": ["daylight-loop"] };
  const first = actionsServedOn(profile, days, swaps, "2026-08-06");
  const again = actionsServedOn(profile, days, swaps, "2026-08-06");
  assert.deepEqual(first.map((a) => a.id), again.map((a) => a.id));
  assert.ok(!first.some((a) => a.id === "daylight-loop"), "that day's swap is honoured");
});

test("the plan day counts how long the top action has held the top slot", () => {
  const key = (back) => dateKey(shiftDays(new Date(2026, 7, 7), -back));
  const today = dateKey(new Date(2026, 7, 7));

  // Nothing has changed, so the same action has been top the whole way back.
  assert.equal(planDayIndex(profile, {}, {}, today, key), 6, "capped at the seventh day");

  // Swapping the top action away on a past day means it wasn't top that day,
  // so the count restarts from there.
  const swapped = (backs) => Object.fromEntries(backs.map((back) => [key(back), ["sleep-anchor"]]));
  assert.equal(planDayIndex(profile, {}, swapped([1, 2, 3]), today, key), 0, "a fresh top action starts at day one");
  assert.equal(planDayIndex(profile, {}, swapped([4, 5, 6]), today, key), 3, "held for three days before that");
});

test("the seven-day plan belongs to one action and has seven steps", () => {
  const plan = getWeekPlan(getAction("sleep-anchor"));
  assert.equal(plan.length, 7);
  assert.deepEqual(plan.map((step) => step.day), ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"]);
  assert.match(plan[1].action, /pick one sleep anchor/i);
  // No action, no plan, rather than a crash.
  assert.deepEqual(getWeekPlan(undefined), []);
});

test("daysBetween counts whole days from the date keys", () => {
  assert.equal(daysBetween("2026-08-01", "2026-08-01"), 0);
  assert.equal(daysBetween("2026-08-01", "2026-08-08"), 7);
  assert.equal(daysBetween("2026-08-01", "2026-07-30"), -2);
  // Spanning a daylight-saving change must not drift.
  assert.equal(daysBetween("2026-03-07", "2026-03-09"), 2);
});

test("recentDays returns a full week, newest first", () => {
  const today = new Date(2026, 7, 7);
  const week = recentDays({}, {}, 7, today);
  assert.equal(week.length, 7);
  assert.equal(week[0].label, "Today");
  assert.equal(week[0].isToday, true);
  assert.equal(week[0].key, dateKey(today));
  assert.equal(week[6].key, dateKey(shiftDays(today, -6)));
});

test("a day counts only the actions it actually offered", () => {
  const today = new Date(2026, 7, 7);
  const key = dateKey(today);
  // Redoing first run used to leave completions from both sets under one date,
  // which read as "5 of 3 done".
  const days = { [key]: ["sleep-anchor", "payday-transfer", "one-invitation", "one-text", "cancel-one"] };
  const served = { [key]: ["sleep-anchor", "payday-transfer", "daylight-loop"] };
  const [day] = recentDays(days, served, 1, today);
  assert.equal(day.done, 2);
  assert.equal(day.served, 3);
});

test("a day with no record falls back to three offered", () => {
  const today = new Date(2026, 7, 7);
  const [day] = recentDays({ [dateKey(today)]: ["sleep-anchor"] }, {}, 1, today);
  assert.equal(day.done, 1);
  assert.equal(day.served, 3);
});

test("the streak counts returning days and forgives an unstarted today", () => {
  const today = new Date(2026, 7, 7);
  const days = {
    [dateKey(today)]: [],
    [dateKey(shiftDays(today, -1))]: ["sleep-anchor"],
    [dateKey(shiftDays(today, -2))]: ["sleep-anchor"],
  };
  assert.equal(streakFrom(days, today), 2);
  assert.equal(streakFrom({ ...days, [dateKey(today)]: ["daylight-loop"] }, today), 3);
});
