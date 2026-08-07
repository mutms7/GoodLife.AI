export type Priority =
  | "Energy"
  | "Money"
  | "Sleep"
  | "Home"
  | "Time outside"
  | "Cooking"
  | "People"
  | "Meaning";

export const PRIORITIES: Priority[] = ["Energy", "Money", "Sleep", "Home", "Time outside", "Cooking", "People", "Meaning"];

export type CheckLevel = "Fine" | "Shaky" | "Rough";
export const CHECK_LEVELS: CheckLevel[] = ["Fine", "Shaky", "Rough"];

export type CheckKey = "energy" | "money" | "sleep" | "social";
export const CHECK_ROWS: { key: CheckKey; label: string }[] = [
  { key: "energy", label: "Energy through the day" },
  { key: "money", label: "Money, month to month" },
  { key: "sleep", label: "Sleep" },
  { key: "social", label: "Time with people" },
];

export type Profile = {
  goodDay: string;
  priorities: Priority[];
  checks: Record<CheckKey, CheckLevel>;
};

/** `short` is the one-line version the phone layout uses. */
export type Action = { id: string; kicker: string; title: string; body: string; short: string };

export type WeekStep = { day: string; action: string };

export const emptyProfile: Profile = {
  goodDay: "",
  priorities: [],
  checks: { energy: "Shaky", money: "Shaky", sleep: "Shaky", social: "Shaky" },
};

/* Twenty-one actions rather than the original nine. Graduation is slow enough
 * now that the pool won't run dry, but the shuffle button draws on the same
 * list, and three swaps on a bad day used to hit the bottom of it. */
const ACTIONS: Record<string, Action> = {
  "sleep-anchor": {
    id: "sleep-anchor",
    kicker: "Energy · 1 min",
    title: "Pick one sleep anchor",
    body: "A wake time you can count on gives your body a cue before you change anything bigger.",
    short: "One wake time you can keep.",
  },
  "payday-transfer": {
    id: "payday-transfer",
    kicker: "Money · 10 min",
    title: "Set aside a little on payday",
    body: "Even $10 counts. The point is that it happens without you having to remember.",
    short: "Even $10 counts. Ten minutes.",
  },
  "daylight-loop": {
    id: "daylight-loop",
    kicker: "Energy · 15 min",
    title: "Get outside before noon",
    body: "Daylight early does more for tonight than anything you'll do at 11pm.",
    short: "Fifteen minutes of daylight.",
  },
  "softer-landing": {
    id: "softer-landing",
    kicker: "Sleep · 2 min",
    title: "Make bedtime a softer landing",
    body: "Charge your phone out of reach and dim one light half an hour before bed. Less friction beats more willpower.",
    short: "Phone out of reach tonight.",
  },
  "one-invitation": {
    id: "one-invitation",
    kicker: "People · 3 min",
    title: "Send one easy invitation",
    body: "A walk on Thursday is easier to say yes to than catching up soon. Give the person a real time and a small ask.",
    short: "One invitation, with a day in it.",
  },
  "home-tradeoffs": {
    id: "home-tradeoffs",
    kicker: "Home · 10 min",
    title: "Write down your home trade-offs",
    body: "Three things you need from a place, and one monthly cost you can't bend on. It's a much easier decision once it's on paper.",
    short: "Three needs, one hard limit.",
  },
  "repeatable-meal": {
    id: "repeatable-meal",
    kicker: "Cooking · 20 min",
    title: "Pick one meal you can repeat",
    body: "Cook the same thing twice this week and keep the ingredients where you can see them. Repetition takes the deciding out of it.",
    short: "One meal, cooked twice.",
  },
  "meaning-block": {
    id: "meaning-block",
    kicker: "Meaning · 15 min",
    title: "Keep a small block for what matters",
    body: "Fifteen minutes for the project, the craft or the person you keep meaning to get to. Put it somewhere real, like a calendar.",
    short: "Fifteen minutes, on the calendar.",
  },
  "two-minute-start": {
    id: "two-minute-start",
    kicker: "Habits · 2 min",
    title: "Make one promise small",
    body: "Pick the two-minute version of the thing and attach it to something you already do. Small enough to survive a bad day.",
    short: "Two minutes, after something you already do.",
  },
  "midday-reset": {
    id: "midday-reset",
    kicker: "Energy · 5 min",
    title: "Stand up between two things",
    body: "Five minutes on your feet between one task and the next. The afternoon dip is usually a posture problem before it's a sleep problem.",
    short: "Five minutes on your feet.",
  },
  "caffeine-curfew": {
    id: "caffeine-curfew",
    kicker: "Sleep · 1 min",
    title: "Give caffeine a cut-off",
    body: "Pick a time in the early afternoon and make it the last one. Caffeine hangs around for hours after you stop noticing it.",
    short: "Last coffee, early afternoon.",
  },
  "cancel-one": {
    id: "cancel-one",
    kicker: "Money · 10 min",
    title: "Cancel one thing you forgot you pay for",
    body: "Open the subscriptions list and end one. It's the rare money move that takes ten minutes once and then keeps paying.",
    short: "One subscription, cancelled.",
  },
  "know-the-number": {
    id: "know-the-number",
    kicker: "Money · 20 min",
    title: "Work out what a month costs",
    body: "One number, roughly right, beats a budget you'll abandon. You can't tell whether you're fine until you know the floor.",
    short: "What one month actually costs.",
  },
  "one-text": {
    id: "one-text",
    kicker: "People · 2 min",
    title: "Send the message you keep not sending",
    body: "The one you've drafted in your head twice already. It doesn't need to be good, it needs to be sent.",
    short: "Send the one you keep drafting.",
  },
  "ask-one-more": {
    id: "ask-one-more",
    kicker: "People · 0 min",
    title: "Ask one more question than feels natural",
    body: "In a conversation you're already having, ask a second question instead of taking your turn. It costs nothing and people notice.",
    short: "One more question than feels natural.",
  },
  "lunch-outside": {
    id: "lunch-outside",
    kicker: "Time outside · 20 min",
    title: "Eat one meal outside",
    body: "Something you're already doing, moved outdoors. No kit, no plan, just somewhere with sky in it.",
    short: "One meal, outdoors.",
  },
  "stock-one-shelf": {
    id: "stock-one-shelf",
    kicker: "Cooking · 15 min",
    title: "Keep three no-cook meals in the house",
    body: "A bad day isn't the time to learn a recipe. Three things you can assemble while tired is a plan for the evenings that actually go wrong.",
    short: "Three meals for a tired night.",
  },
  "ten-minute-reset": {
    id: "ten-minute-reset",
    kicker: "Home · 10 min",
    title: "Clear one surface",
    body: "Not the room, one surface. A clear counter changes how the whole place feels for about a tenth of the effort.",
    short: "One surface, ten minutes.",
  },
  "one-friction": {
    id: "one-friction",
    kicker: "Habits · 5 min",
    title: "Move one obstacle out of the way",
    body: "Shoes by the door, the guitar out of its case, the app off the home screen. Change the room instead of arguing with yourself.",
    short: "Move one thing, either direction.",
  },
  "never-miss-twice": {
    id: "never-miss-twice",
    kicker: "Habits · 2 min",
    title: "Do the recovery version",
    body: "You've missed one, and that's a Tuesday. Do the smallest possible version today so it doesn't quietly become two.",
    short: "The smallest version, today.",
  },
  "one-page": {
    id: "one-page",
    kicker: "Meaning · 15 min",
    title: "Make a bad first version",
    body: "One page, one sketch, one verse, deliberately not good. Starting badly is the whole trick, because you can't edit nothing.",
    short: "One bad first version.",
  },
};

/* Ordered per source, so when one action graduates the next in that line takes
 * its place instead of the slot collapsing into something unrelated. */
const PRIORITY_ACTIONS: Record<Priority, string[]> = {
  Energy: ["daylight-loop", "midday-reset", "caffeine-curfew"],
  Money: ["payday-transfer", "cancel-one", "know-the-number"],
  Sleep: ["sleep-anchor", "softer-landing", "caffeine-curfew"],
  Home: ["home-tradeoffs", "ten-minute-reset"],
  "Time outside": ["daylight-loop", "lunch-outside", "midday-reset"],
  Cooking: ["repeatable-meal", "stock-one-shelf"],
  People: ["one-invitation", "one-text", "ask-one-more"],
  Meaning: ["meaning-block", "one-page"],
};

/** Where a struggling check sends us first. Order matters: it decides the
 *  order of the day's three. */
const CHECK_ACTIONS: [CheckKey, string[]][] = [
  ["sleep", ["sleep-anchor", "softer-landing", "caffeine-curfew"]],
  ["money", ["payday-transfer", "cancel-one", "know-the-number"]],
  ["energy", ["daylight-loop", "midday-reset", "lunch-outside"]],
  ["social", ["one-invitation", "one-text", "ask-one-more"]],
];

const FILLERS = ["two-minute-start", "one-friction", "ten-minute-reset", "never-miss-twice", "meaning-block", "repeatable-meal", "one-page", "stock-one-shelf", "ask-one-more", "lunch-outside"];

/** Checked off this many times and an action stops being suggested.
 *
 * Two weeks, because that's roughly how long a repetition has to keep
 * happening before it carries itself. Three was quicker to feel like progress
 * and was lying about it: nobody has built a habit in three days. The visible
 * progress is the "4 of 14" counter on the row, and the shuffle button is
 * there for the days a suggestion doesn't fit. */
export const GRADUATE_AT = 14;

/** How many times each action has ever been checked off. */
export function completionCounts(days: Record<string, string[]>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ids of Object.values(days)) {
    for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/** Counts from the days strictly before `date`.
 *
 * Today's three are built from this rather than from every completion ever, so
 * checking an action off for the third time doesn't make it graduate and
 * vanish out from under the tick you just earned. Graduation lands tomorrow.
 * It also means any past day's three can be recomputed exactly, which is why
 * none of this needs storing. */
export function completionCountsBefore(days: Record<string, string[]>, date: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [key, ids] of Object.entries(days)) {
    // Date keys are ISO, so a string compare is a date compare.
    if (key >= date) continue;
    for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

export function hasGraduated(counts: Record<string, number>, id: string): boolean {
  return (counts[id] ?? 0) >= GRADUATE_AT;
}

/** Actions that have earned their way off the list. */
export function graduatedActions(counts: Record<string, number>): Action[] {
  return Object.keys(ACTIONS).filter((id) => hasGraduated(counts, id)).map((id) => ACTIONS[id]);
}

export function getAction(id: string): Action | undefined {
  return ACTIONS[id];
}

/** Every candidate for this profile, best first.
 *
 * Sources are drawn round-robin rather than one at a time, so the top of the
 * list stays varied. Draining a whole source first would hand someone with
 * rough sleep three sleep actions and nothing else. */
export function rankActions(profile: Profile): Action[] {
  const sources: string[][] = [
    ...CHECK_ACTIONS.filter(([key]) => profile.checks[key] === "Rough").map(([, ids]) => ids),
    ...profile.priorities.map((priority) => PRIORITY_ACTIONS[priority]),
    ...CHECK_ACTIONS.filter(([key]) => profile.checks[key] === "Shaky").map(([, ids]) => ids),
    FILLERS,
  ];

  const ordered: Action[] = [];
  const seen = new Set<string>();
  const depth = Math.max(...sources.map((source) => source.length));
  for (let index = 0; index < depth; index += 1) {
    for (const source of sources) {
      const id = source[index];
      if (!id || seen.has(id) || !ACTIONS[id]) continue;
      seen.add(id);
      ordered.push(ACTIONS[id]);
    }
  }
  return ordered;
}

/** The day's three: the best candidates that haven't graduated and haven't
 *  been swapped away today. If the pool somehow runs dry it reuses graduated
 *  ones, because three empty rows would be worse than a repeat. */
export function getDailyActions(
  profile: Profile,
  counts: Record<string, number> = {},
  swapped: string[] = [],
): Action[] {
  const ranked = rankActions(profile);
  const picked = ranked.filter((action) => !hasGraduated(counts, action.id) && !swapped.includes(action.id)).slice(0, 3);
  for (const action of ranked) {
    if (picked.length >= 3) break;
    if (!picked.some((item) => item.id === action.id)) picked.push(action);
  }
  return picked;
}

/** The seven-day sequence for one action. The Week screen works out which day
 *  you're on from when that action became your primary. */
export function getWeekPlan(action: Action | undefined): WeekStep[] {
  if (!action) return [];
  const lowered = action.title.toLowerCase();
  return [
    { day: "Day 1", action: action.body },
    { day: "Day 2", action: `Do the two-minute version of ${lowered} and count it.` },
    { day: "Day 3", action: `Attach ${lowered} to something you already do, so you don't have to remember it.` },
    { day: "Day 4", action: "Put one helpful thing in your path and one distraction out of it." },
    { day: "Day 5", action: "Check it off, then write one sentence about how it actually went." },
    { day: "Day 6", action: "Tell one person what you're practising. Saying it out loud makes it harder to drop." },
    { day: "Day 7", action: "Keep what worked, drop what didn't, and pick the smallest repeat for next week." },
  ];
}

/** What was on offer on a given day, recomputed rather than remembered.
 *  Deterministic from the profile, the completions before that day, and any
 *  swaps made on it. */
export function actionsServedOn(
  profile: Profile,
  days: Record<string, string[]>,
  swaps: Record<string, string[]>,
  date: string,
): Action[] {
  return getDailyActions(profile, completionCountsBefore(days, date), swaps[date] ?? []);
}

/** How long the current top action has held the top slot, walking back day by
 *  day while it stays the same. That's the seven-day sequence's day number,
 *  with no start date to store and nothing to go stale if the profile changes. */
export function planDayIndex(
  profile: Profile,
  days: Record<string, string[]>,
  swaps: Record<string, string[]>,
  today: string,
  previousKey: (back: number) => string,
): number {
  const primary = actionsServedOn(profile, days, swaps, today)[0]?.id;
  if (!primary) return -1;
  let index = 0;
  while (index < 6) {
    const key = previousKey(index + 1);
    if (actionsServedOn(profile, days, swaps, key)[0]?.id !== primary) break;
    index += 1;
  }
  return index;
}

/* Routing used to live here: a keyword list deciding both the topic and whether
 * the model was allowed to answer. Both jobs moved. The topic now comes from the
 * model reading playbook.md, and the model answers everything except the one
 * topic that declares a fixed reply. See lib/playbook.ts. */

export function normalizeCoachText(text: string): string {
  return text
    .split(String.fromCodePoint(0x2014))
    .map((part) => part.trim())
    .join(", ");
}
