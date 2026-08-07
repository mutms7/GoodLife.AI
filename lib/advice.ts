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
};

const PRIORITY_ACTION: Record<Priority, string> = {
  Energy: "daylight-loop",
  Money: "payday-transfer",
  Sleep: "sleep-anchor",
  Home: "home-tradeoffs",
  "Time outside": "daylight-loop",
  Cooking: "repeatable-meal",
  People: "one-invitation",
  Meaning: "meaning-block",
};

/** Where a struggling check sends us first. Order matters: it decides the
 *  order of the day's three. */
const CHECK_ACTION: [CheckKey, string][] = [
  ["sleep", "sleep-anchor"],
  ["money", "payday-transfer"],
  ["energy", "daylight-loop"],
  ["social", "one-invitation"],
];

const FILLERS = ["two-minute-start", "daylight-loop", "payday-transfer", "softer-landing"];

/** The day's three, ranked by plain logic so the visible recommendations stay
 *  predictable and testable. Rough answers come first, then what the person
 *  said matters, then the shaky ones. */
export function getDailyActions(profile: Profile): Action[] {
  const picked: Action[] = [];
  const add = (id: string) => {
    if (picked.length < 3 && !picked.some((action) => action.id === id)) picked.push(ACTIONS[id]);
  };
  for (const [key, id] of CHECK_ACTION) if (profile.checks[key] === "Rough") add(id);
  for (const priority of profile.priorities) add(PRIORITY_ACTION[priority]);
  for (const [key, id] of CHECK_ACTION) if (profile.checks[key] === "Shaky") add(id);
  for (const id of FILLERS) add(id);
  return picked;
}

export function getFirstWeekPlan(profile: Profile): WeekStep[] {
  const primary = getDailyActions(profile)[0];
  const lowered = primary.title.toLowerCase();
  return [
    { day: "Today", action: primary.body },
    { day: "Tomorrow", action: `Do the two-minute version of ${lowered} and count it.` },
    { day: "Day 3", action: `Attach ${lowered} to something you already do, so you don't have to remember it.` },
    { day: "Day 4", action: "Put one helpful thing in your path and one distraction out of it." },
    { day: "Day 5", action: "Check it off, then write one sentence about how it actually went." },
    { day: "Day 6", action: "Tell one person what you're practising. Saying it out loud makes it harder to drop." },
    { day: "Day 7", action: "Keep what worked, drop what didn't, and pick the smallest repeat for next week." },
  ];
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
