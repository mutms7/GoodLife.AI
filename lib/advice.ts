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
        title: "Set aside a little on payday",
        why: "An automatic transfer gives you some breathing room without asking you to remember every month.",
        action: "Set a payday transfer you can keep (even $10 is a start).",
        area: "money",
        effort: "10 minutes",
      });
    }
    if (priority === "energy") {
      add({
        id: "sleep-anchor",
        title: "Pick one sleep anchor",
        why: "A wake time you can count on gives your body a useful cue before you change anything bigger.",
        action: "Choose a wake time you can keep within 30 minutes for the next seven days.",
        area: "energy",
        effort: "1 minute",
      });
    }
    if (priority === "relationships") {
      add({
        id: "connection-invite",
        title: "Send one easy invitation",
        why: "A specific, low-pressure invitation gives someone a clear way to say yes.",
        action: "Text someone: 'Want to take a 20-minute walk this week?'",
        area: "connection",
        effort: "3 minutes",
      });
    }
    if (priority === "meaning") {
      add({
        id: "meaning-block",
        title: "Keep a small block for what matters",
        why: "A repeatable pocket of time lets your values show up in an ordinary week.",
        action: "Set aside 15 minutes for a project, craft, faith, or service you care about.",
        area: "meaning",
        effort: "15 minutes",
      });
    }
    if (priority === "home") {
      add({
        id: "home-inventory",
        title: "Write down your home trade-offs",
        why: "Knowing what you need from a home is more helpful than feeling pushed to buy or rent.",
        action: "List your top three housing needs and one monthly cost you cannot bend on.",
        area: "home",
        effort: "10 minutes",
      });
    }
    if (priority === "confidence") {
      add({
        id: "confidence-proof",
        title: "Keep one piece of evidence",
        why: "Remembering something you handled well gives self-trust a real place to stand.",
        action: "Write down one hard thing you handled and what it says about you.",
        area: "meaning",
        effort: "5 minutes",
      });
    }
  }

  if (profile.debt === "high-interest") {
    add({
      id: "debt-clarity",
      title: "Put high-interest debt on one page",
      why: "A balance, rate, and minimum payment are easier to work with when they are visible.",
      action: "List each balance and rate, and keep a small buffer before making extra payments.",
      area: "money",
      effort: "15 minutes",
    });
  }
  if (profile.emergency !== "three-months") {
    add({
      id: "buffer",
      title: "Start a small emergency buffer",
      why: "Accessible savings can keep a surprise from turning into a crisis.",
      action: "Pick a starter target (say, $500) and automate a weekly amount.",
      area: "money",
      effort: "10 minutes",
    });
  }
  if (profile.sleep === "inconsistent" || profile.energy === "drained") {
    add({
      id: "evening-cue",
      title: "Make bedtime a softer landing",
      why: "A little less friction before bed makes it easier to give sleep a fair chance.",
      action: "Charge your phone out of reach and dim one light 30 minutes before bed.",
      area: "energy",
      effort: "2 minutes",
    });
  }
  if (profile.outdoor === "rarely") {
    add({
      id: "outside-loop",
      title: "Take a short daylight loop",
      why: "A few minutes outside can give your morning a gentle transition into movement.",
      action: "Step outside for five minutes after your first drink of water.",
      area: "energy",
      effort: "5 minutes",
    });
  }
  while (starts.length < 3) {
    add({
      id: `default-${starts.length}`,
      title: "Make one promise small",
      why: "A repeatable action is easier to live with than a plan that asks for a total reset.",
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
    { day: "Today", focus: "Make the first step visible", action: primary.action },
    { day: "Tomorrow", focus: "Make it easier", action: `Shrink it: try ${primary.title.toLowerCase()} for two minutes.` },
    { day: "Day 3", focus: "Use a cue you already have", action: `After a habit you already keep, try ${primary.title.toLowerCase()}.` },
    { day: "Day 4", focus: "Set up the room", action: "Put one helpful thing in your path and one distraction out of it." },
    { day: "Day 5", focus: "Notice what happened", action: "Mark the action complete and write one sentence about how it felt." },
    { day: "Day 6", focus: "Tell someone", action: "Share what you are practicing with a supportive person." },
    { day: "Day 7", focus: "Start again quickly", action: "Review what helped, then choose the smallest repeat for next week." },
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
  if (!text) return "What feels most useful to talk through today: money, energy, connection, meaning, or home?";
  if (classifyMessage(message) === "crisis") {
    return "I'm glad you told me. If you may hurt yourself or you're in immediate danger, call your local emergency number now or go to the nearest emergency department. In Canada or the U.S., call or text 988 for immediate, confidential crisis support. Please tell someone you trust and stay with them while you get help. You deserve a person beside you right now.";
  }
  if (hasAny(text, ["money", "budget", "invest", "saving", "debt", "etf", "retire"])) {
    const debtLine = profile.debt === "high-interest"
      ? "Keep minimum payments current, then make a payoff plan for high-interest debt before taking on market risk."
      : "Once you have a starter buffer, automate an amount that feels comfortable for your goals.";
    return `A sensible order is to cover essentials, spend less than you bring in where you can, and build accessible emergency savings. ${debtLine} For long-term goals, you might use an automatic contribution to a low-cost, diversified broad-market ETF or equivalent fund. Check the account rules, fees, taxes, and your time horizon, and choose a level of risk you can live with. Markets can fall, so there are no guarantees. Start with one transfer you can keep. (This is general education, not personal financial advice.)`;
  }
  if (hasAny(text, ["rent", "buy", "house", "housing", "mortgage", "home"])) {
    return "Renting can be a good fit when flexibility, lower commitment, or a changing life matter. Owning can bring more control and stability, but the full cost includes interest, taxes, insurance, maintenance, and opportunity cost alongside the mortgage. Compare the likely five-year cost with the life you want. Neither choice is automatically better.";
  }
  if (hasAny(text, ["sleep", "tired", "energy", "rest"])) {
    return "Try one sleep anchor: a wake time you can keep most days, plus a 30-minute softer landing at night. Put your phone out of reach, dim a light, and get some daylight early. If fatigue, snoring, or mood changes persist, a clinician can help. This is general education, not a diagnosis.";
  }
  if (hasAny(text, ["outside", "outdoors", "nature", "walk", "hike", "daylight"])) {
    return "Make outside time a cue, not a project. Step out for five minutes after your first drink or between two tasks, and let the pace be easy. A little daylight and movement can support mood, sleep, and energy; any amount is a useful start.";
  }
  if (hasAny(text, ["meditat", "mindful", "breath", "calm down"])) {
    return "Try a two-minute arrival: feel both feet, notice one sound, and let the exhale run a little longer than the inhale. You don't need to empty your mind; returning gently is the practice.";
  }
  if (hasAny(text, ["cook", "cooking", "meal", "recipe", "food"])) {
    return "Pick one reliable meal for this week and keep the ingredients easy to see. Make the first step tiny (wash the greens, start the rice, or open the recipe). Repetition cuts down decisions, and food doesn't need to be elaborate to help.";
  }
  if (hasAny(text, ["habit", "routine", "motivation", "procrastinat"])) {
    return "Try an identity-sized habit: 'I'm a person who takes the next tiny step.' Give it a cue, make it two minutes, and put it after something you already do. Keep the useful option nearby. If you miss, begin again tomorrow. One missed day doesn't have to become two.";
  }
  if (hasAny(text, ["friend", "lonely", "social", "relationship", "people"])) {
    return "Connection tends to grow through specific, low-pressure repetitions. Send one honest invitation, ask a curious follow-up, and put a recurring walk or call on the calendar if that feels right. Consistency matters more than performing, and a small welcoming moment counts.";
  }
  if (hasAny(text, ["meaning", "purpose", "stuck", "happy", "anxious", "stress"])) {
    return "Notice the feeling without turning it into a verdict, then choose a two-minute action that lines up with what matters to you. Meaning can show up after you begin: make something, help someone, step outside, or give one person your full attention. If distress persists or gets in the way of daily life, a qualified professional can support you.";
  }
  const vision = profile.vision ? ` You described a good life as "${profile.vision}."` : "";
  return `You don't have to redesign your life today. Your next useful start is "${getAdviceStarts(profile)[0].title}." What would make that feel 20% easier?${vision}`;
}

export function normalizeCoachText(text: string): string {
  return text
    .split(String.fromCodePoint(0x2014))
    .map((part) => part.trim())
    .join(", ");
}
