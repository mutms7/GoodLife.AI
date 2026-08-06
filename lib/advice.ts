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

function hasAny(message: string, words: string[]) {
  return words.some((word) => message.includes(word));
}

export type AdviceDomain = "crisis" | "money" | "health" | "housing" | "habits" | "relationships" | "meaning" | "general";

export function classifyMessage(message: string): AdviceDomain {
  const text = message.trim().toLowerCase();
  if (hasAny(text, ["suicide", "kill myself", "self harm", "self-harm", "hurt myself", "overdose", "overdosed", "end my life", "don't want to live", "i want to die", "wish i were dead", "no reason to live", "can't go on", "cannot go on"])) return "crisis";
  if (hasAny(text, ["money", "budget", "invest", "saving", "savings", "debt", "etf", "retire", "tax", "fee", "payday", "broke"])) return "money";
  if (hasAny(text, ["rent", "buy", "house", "housing", "mortgage", "home"])) return "housing";
  if (hasAny(text, ["sleep", "tired", "energy", "rest", "doctor", "symptom", "exercise", "health", "outside", "outdoors", "nature", "walk", "hike", "daylight", "bedtime"])) return "health";
  if (hasAny(text, ["habit", "routine", "motivation", "procrastinat", "cook", "cooking", "meal", "recipe", "food", "skip", "skipped", "missed", "behind", "quit", "too much", "overwhelm"])) return "habits";
  if (hasAny(text, ["friend", "lonely", "social", "relationship", "people"])) return "relationships";
  if (hasAny(text, ["meaning", "purpose", "stuck", "happy", "anxious", "stress", "meditat", "mindful", "breath", "calm down"])) return "meaning";
  return "general";
}

/** Money, health and housing never reach the model, and crisis language never
 *  gets near it. Everything else can, when the model is loaded. */
export function isModelSafe(domain: AdviceDomain) {
  return domain === "general" || domain === "habits" || domain === "relationships" || domain === "meaning";
}

export type ReplySource = "model" | "fixed" | "model-off" | "model-failed";

/** The note under a coach reply. It is a designed element, not debug output,
 *  so every reply carries one. */
export function noteFor(domain: AdviceDomain, source: ReplySource): string {
  if (domain === "crisis") return "Crisis language, so this never goes to the model.";
  if (source === "model") return "Answered by the local model, running on your device.";
  if (source === "model-off") return "The local model isn't running, so this is the fixed guidance.";
  if (source === "model-failed") return "The model didn't finish that one, so this is the fixed guidance.";
  if (domain === "money") return "Money question, so this comes from the fixed guidance, not the model.";
  if (domain === "housing") return "Housing question, so this comes from the fixed guidance, not the model.";
  if (domain === "health") return "Health question, so this comes from the fixed guidance, not the model.";
  return "Fixed guidance, written ahead of time rather than generated.";
}

export function coachReply(message: string, profile: Profile): string {
  const text = message.trim().toLowerCase();
  if (!text) return "Tell me what today actually looks like. Energy, money, sleep, people, or something else entirely.";

  const domain = classifyMessage(message);

  if (domain === "crisis") {
    return "I'm not the right help for this, and I don't want to guess. Please contact your local emergency number now, or call or text 988 in Canada and the US for confidential crisis support. If there's someone nearby you trust, tell them tonight. You deserve a person beside you, not an app.";
  }

  if (domain === "money") {
    const investing = hasAny(text, ["invest", "etf", "stock", "market", "retire", "fund"])
      ? " For investing, the boring answer is a low-cost diversified fund and a long time horizon. Check the fees, the account rules and how much of a drop you could sit through, because there are no guarantees."
      : "";
    return `Start with a buffer you can actually reach, not a number that sounds impressive. A few hundred dollars in a plain savings account keeps a flat tire from turning into a credit card balance. After that, whatever is charging you the most interest is the next thing to go.${investing} This is general education, not advice about your situation.`;
  }

  if (domain === "housing") {
    return "Renting buys flexibility and owning buys control, and both cost more than the sticker. Put the likely five-year total side by side, interest, taxes, insurance, maintenance and what you'd give up elsewhere, then compare that against the life you actually want in those five years. Neither one is automatically the grown-up choice.";
  }

  if (domain === "health") {
    if (hasAny(text, ["outside", "outdoors", "nature", "walk", "hike", "daylight"])) {
      return "Make outside a cue, not a project. Step out for five minutes after your first drink of the day, or between two tasks, and let the pace be easy. Early light helps your sleep more than anything you'll try at 11pm.";
    }
    return "Wake time is the easier end to hold, and it usually pulls bedtime along with it. Pick one time you can keep within 30 minutes for seven days, weekends included, and leave the evening alone for now. If the tiredness sticks around, that's worth a real clinician, not me.";
  }

  if (hasAny(text, ["skip", "skipped", "missed", "behind", "quit", "failed", "too much", "overwhelm"])) {
    return "One miss is just a Tuesday. Two in a row is how a habit quietly ends, so the only rule is don't miss twice. Do the smallest version of it today and call that done.";
  }

  if (domain === "habits") {
    if (hasAny(text, ["cook", "cooking", "meal", "recipe", "food"])) {
      return "Pick one meal you can make without thinking and cook it twice this week. Keep the ingredients where you can see them. Most of the effort in cooking is the deciding, so take that part out first.";
    }
    return "Try an identity-sized habit: I'm someone who takes the next small step. Give it a cue you already have, make it two minutes long, and keep the useful option within reach. If you miss, begin again tomorrow.";
  }

  if (domain === "relationships") {
    return "Connection grows out of specific, low-pressure repetitions. Send one honest invitation with a real day in it, ask one more question than feels natural, and put the walk or the call somewhere it repeats. Showing up beats performing.";
  }

  if (domain === "meaning") {
    return "Notice the feeling without turning it into a verdict about you, then pick a two-minute thing that lines up with what you care about. Meaning usually shows up after you start, not before. If this has been heavy for a while, a qualified professional is a better place to take it than an app.";
  }

  const anchor = profile.goodDay.trim();
  const pointer = anchor ? ` You told me a good day looks like this: "${anchor}." I'll keep pointing back to it.` : "";
  return `Say a bit more about what today actually looks like. I'd rather hand you one small thing you'll do than five you won't.${pointer}`;
}

export function normalizeCoachText(text: string): string {
  return text
    .split(String.fromCodePoint(0x2014))
    .map((part) => part.trim())
    .join(", ");
}
