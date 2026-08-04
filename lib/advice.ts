export type Priority =
  | "energy"
  | "money"
  | "relationships"
  | "meaning"
  | "home"
  | "confidence";

export type Profile = {
  name: string;
  vision?: string;
  priorities: Priority[];
  energy: "drained" | "steady" | "energized";
  time: "scraps" | "some" | "room";
  moneyFeel: "stretched" | "okay" | "growing";
  debt: "none" | "some" | "high-interest";
  emergency: "none" | "some" | "three-months";
  housing: "renting" | "owning" | "exploring";
  sleep: "inconsistent" | "okay" | "restful";
  social: "rarely" | "weekly" | "often";
  outdoor: "rarely" | "weekly" | "often";
  cooking: "rarely" | "sometimes" | "often";
  meditation: "curious" | "sometimes" | "regular";
};

export type Start = {
  id: string;
  title: string;
  why: string;
  action: string;
  area: "money" | "energy" | "connection" | "meaning" | "home";
  effort: string;
};

export type WeekDay = { day: string; focus: string; action: string };

const priorityLabels: Record<Priority, string> = {
  energy: "Energy",
  money: "Money",
  relationships: "Relationships",
  meaning: "Meaning",
  home: "Home",
  confidence: "Confidence",
};

export function labelForPriority(priority: Priority) {
  return priorityLabels[priority];
}

export function getAdviceStarts(profile: Profile): Start[] {
  const starts: Start[] = [];
  const add = (start: Start) => {
    if (starts.length < 3 && !starts.some((item) => item.id === start.id)) starts.push(start);
  };

  for (const priority of profile.priorities) {
    if (priority === "money") {
      add({
        id: "pay-yourself-first",
        title: "Make saving the first bill",
        why: "A small automatic transfer builds breathing room without relying on willpower.",
        action: "Set an automatic payday transfer, even if it starts at $10.",
        area: "money",
        effort: "10 minutes",
      });
    }
    if (priority === "energy") {
      add({
        id: "sleep-anchor",
        title: "Choose one sleep anchor",
        why: "A consistent wake time gives your body a dependable cue before changing everything else.",
        action: "Pick a wake time you can keep within 30 minutes for seven days.",
        area: "energy",
        effort: "1 minute",
      });
    }
    if (priority === "relationships") {
      add({
        id: "connection-invite",
        title: "Send one warm invitation",
        why: "Specific, low-pressure invitations make connection easier to act on.",
        action: "Text one person: ‘Want to take a 20-minute walk this week?’",
        area: "connection",
        effort: "3 minutes",
      });
    }
    if (priority === "meaning") {
      add({
        id: "meaning-block",
        title: "Protect a tiny meaning block",
        why: "A repeatable pocket for what matters turns values into a lived pattern.",
        action: "Reserve 15 minutes for a project, craft, faith, or service you value.",
        area: "meaning",
        effort: "15 minutes",
      });
    }
    if (priority === "home") {
      add({
        id: "home-inventory",
        title: "Name your home trade-offs",
        why: "Clarity about flexibility, stability, and total costs beats pressure to buy or rent.",
        action: "Write your top three housing needs and one non-negotiable monthly cost.",
        area: "home",
        effort: "10 minutes",
      });
    }
    if (priority === "confidence") {
      add({
        id: "confidence-proof",
        title: "Collect one piece of proof",
        why: "Noticing a past follow-through is a practical way to grow self-trust.",
        action: "Write down one hard thing you handled and the trait it shows.",
        area: "meaning",
        effort: "5 minutes",
      });
    }
  }

  if (profile.debt === "high-interest") {
    add({
      id: "debt-clarity",
      title: "Make high-interest debt visible",
      why: "A clear balance, rate, and minimum payment turns an invisible drain into a plan.",
      action: "List each balance and rate; keep a starter buffer before extra payments.",
      area: "money",
      effort: "15 minutes",
    });
  }
  if (profile.emergency !== "three-months") {
    add({
      id: "buffer",
      title: "Start a calm-money buffer",
      why: "A small accessible emergency fund helps surprises stay surprises, not emergencies.",
      action: "Choose a starter target (for example, $500) and automate a weekly amount.",
      area: "money",
      effort: "10 minutes",
    });
  }
  if (profile.sleep === "inconsistent" || profile.energy === "drained") {
    add({
      id: "evening-cue",
      title: "Create a softer landing",
      why: "Reducing friction before bed makes restorative sleep more likely.",
      action: "Put your phone on charge outside reach and dim one light 30 minutes before bed.",
      area: "energy",
      effort: "2 minutes",
    });
  }
  if (profile.outdoor === "rarely") {
    add({
      id: "outside-loop",
      title: "Take a daylight loop",
      why: "A short outdoor cue supports movement, mood, and an easier transition into the day.",
      action: "Step outside for five minutes after your first drink of water.",
      area: "energy",
      effort: "5 minutes",
    });
  }
  while (starts.length < 3) {
    add({
      id: `default-${starts.length}`,
      title: "Keep one promise small",
      why: "Tiny, repeatable actions are easier to make part of who you are.",
      action: "Choose one two-minute action and attach it to something you already do.",
      area: "meaning",
      effort: "2 minutes",
    });
  }
  return starts;
}

export function getFirstWeekPlan(profile: Profile): WeekDay[] {
  const starts = getAdviceStarts(profile);
  const primary = starts[0];
  return [
    { day: "Today", focus: "Make it obvious", action: primary.action },
    { day: "Tomorrow", focus: "Make it easy", action: `Shrink the step: ${primary.title.toLowerCase()} for just two minutes.` },
    { day: "Day 3", focus: "Stack the cue", action: `After a habit you already have, try your ${primary.title.toLowerCase()}.` },
    { day: "Day 4", focus: "Shape the room", action: "Move one helpful object into your path and one distraction out of it." },
    { day: "Day 5", focus: "Notice the win", action: "Mark the action complete and write one sentence about how it felt." },
    { day: "Day 6", focus: "Share the plan", action: "Tell a supportive person what you are practicing this week." },
    { day: "Day 7", focus: "Never miss twice", action: "Review what worked, then choose the smallest repeat for next week." },
  ];
}

function hasAny(message: string, words: string[]) {
  return words.some((word) => message.includes(word));
}

export type AdviceDomain = "crisis" | "money" | "health" | "housing" | "habits" | "relationships" | "meaning" | "general";

export function classifyMessage(message: string): AdviceDomain {
  const text = message.trim().toLowerCase();
  if (hasAny(text, ["suicide", "kill myself", "self harm", "self-harm", "hurt myself", "overdose", "overdosed", "end my life", "don't want to live", "i want to die", "wish i were dead", "no reason to live", "can't go on", "cannot go on"])) return "crisis";
  if (hasAny(text, ["money", "budget", "invest", "saving", "debt", "etf", "retire", "tax", "fee"])) return "money";
  if (hasAny(text, ["rent", "buy", "house", "housing", "mortgage", "home"])) return "housing";
  if (hasAny(text, ["sleep", "tired", "energy", "rest", "doctor", "symptom", "exercise", "health", "outside", "outdoors", "nature", "walk", "hike", "daylight"])) return "health";
  if (hasAny(text, ["habit", "routine", "motivation", "procrastinat", "cook", "cooking", "meal", "recipe", "food"])) return "habits";
  if (hasAny(text, ["friend", "lonely", "social", "relationship", "people"])) return "relationships";
  if (hasAny(text, ["meaning", "purpose", "stuck", "happy", "anxious", "stress", "meditat", "mindful", "breath", "calm down"])) return "meaning";
  return "general";
}

export function coachReply(message: string, profile: Profile): string {
  const text = message.trim().toLowerCase();
  if (!text) return "Tell me what feels most important today—money, energy, connection, meaning, or home.";
  if (classifyMessage(message) === "crisis") {
    return "I’m really glad you said something. If you might hurt yourself or are in immediate danger, call your local emergency number now or go to the nearest emergency department. In Canada or the U.S., call or text 988 for immediate, confidential crisis support. You deserve a person with you—please tell someone you trust and stay with them while you get help.";
  }
  if (hasAny(text, ["money", "budget", "invest", "saving", "debt", "etf", "retire"])) {
    const debtLine = profile.debt === "high-interest" ? "Keep minimum payments current and prioritize a payoff plan for high-interest debt before taking market risk." : "Once a starter buffer is in place, automate a comfortable amount toward your goals.";
    return `A calm money order of operations: cover essentials, live below your means where you can, and build an accessible emergency buffer. ${debtLine} For long-term money, pay yourself first with an automatic contribution to a low-cost, diversified broad-market ETF or equivalent fund. Use tax-advantaged accounts available in your jurisdiction, check fees and taxes, and match risk to your time horizon. Markets can fall; there are no guarantees. Start with one transfer you can keep. (General education, not personalized financial advice.)`;
  }
  if (hasAny(text, ["rent", "buy", "house", "housing", "mortgage", "home"])) {
    return "Renting can be an excellent choice when flexibility, lower commitment, or a changing life matter. Owning can offer control and potential stability, but include interest, taxes, insurance, maintenance, and opportunity cost—not just the mortgage. Compare your likely five-year total cost and the life you want, without assuming one is always more enjoyable.";
  }
  if (hasAny(text, ["sleep", "tired", "energy", "rest"])) {
    return "Try one sleep anchor: a wake time you can keep most days, plus a 30-minute softer landing at night. Put the phone out of reach, dim a light, and get daylight early. If persistent fatigue, snoring, or mood changes worry you, a clinician can help; this is general education, not diagnosis.";
  }
  if (hasAny(text, ["outside", "outdoors", "nature", "walk", "hike", "daylight"])) {
    return "Make outside time a cue, not a project: step out for five minutes after your first drink or between two tasks. Let the pace be easy. A little daylight and movement can support mood, sleep, and energy; any amount is a useful start.";
  }
  if (hasAny(text, ["meditat", "mindful", "breath", "calm down"])) {
    return "Try a two-minute arrival: feel both feet, notice one sound, and make the exhale a little longer than the inhale. You do not have to empty your mind; returning gently is the practice.";
  }
  if (hasAny(text, ["cook", "cooking", "meal", "recipe", "food"])) {
    return "Choose one reliable meal for this week, keep the ingredients visible, and make the first step tiny (wash greens, start rice, or open the recipe). Repetition lowers decision load; nourishment does not need to be elaborate.";
  }
  if (hasAny(text, ["habit", "routine", "motivation", "procrastinat"])) {
    return "Use an identity-sized habit: ‘I’m a person who takes the next tiny step.’ Make it obvious with a cue, make it easy (two minutes), stack it after something you already do, and track the attempt. Design the environment so the good choice is nearby. If you miss, restart tomorrow—never miss twice.";
  }
  if (hasAny(text, ["friend", "lonely", "social", "relationship", "people"])) {
    return "Connection grows through specific, low-pressure repetitions. Send one honest invitation, ask one curious follow-up, and put a recurring walk or call on the calendar. Aim for consistency over performing; a small welcoming moment counts.";
  }
  if (hasAny(text, ["meaning", "purpose", "stuck", "happy", "anxious", "stress"])) {
    return "Notice the feeling without making it a verdict, then choose a values-aligned two-minute action. Meaning often appears after showing up: make something, help someone, move outside, or give full attention to one person. If distress is persistent or impairing, a qualified professional can support you.";
  }
  const vision = profile.vision ? ` You described a good life as “${profile.vision}.”` : "";
  return `You do not have to redesign your life today. Your current highest-leverage start is “${getAdviceStarts(profile)[0].title}.” What would make that action feel 20% easier?${vision}`;
}
