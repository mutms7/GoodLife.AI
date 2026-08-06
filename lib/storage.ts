import { PRIORITIES, emptyProfile, type CheckKey, type CheckLevel, type Priority, type Profile } from "@/lib/advice";

export type Message = { isUser: boolean; text: string; note?: string };
/** Completed action ids, keyed by local date. */
export type DayLog = Record<string, string[]>;

export type SavedData = {
  version: 2;
  profile: Profile | null;
  days: DayLog;
  msgs: Message[];
  modelOn: boolean;
};

const KEY = "goodlife-local-v2";
const LEGACY_KEY = "goodlife-local-v1";

export const emptyData: SavedData = { version: 2, profile: null, days: {}, msgs: [], modelOn: false };

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Days returned to in a row. A day counts once anything is checked off, and
 *  today not being started yet doesn't end the run. */
export function streakFrom(days: DayLog, today = new Date()) {
  let cursor = today;
  if (!(days[dateKey(cursor)]?.length)) cursor = shiftDays(cursor, -1);
  let count = 0;
  while (days[dateKey(cursor)]?.length) {
    count += 1;
    cursor = shiftDays(cursor, -1);
  }
  return count;
}

/** The rail's "Your days": today plus the three before it. */
export function recentDays(days: DayLog, today = new Date()) {
  return [0, -1, -2, -3].map((offset) => {
    const date = shiftDays(today, offset);
    const key = dateKey(date);
    return {
      key,
      label: offset === 0 ? "Today" : new Intl.DateTimeFormat("en", { weekday: "long" }).format(date),
      done: days[key]?.length ?? 0,
      isToday: offset === 0,
    };
  });
}

function readPriorities(value: unknown): Priority[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Priority => typeof item === "string" && PRIORITIES.includes(item as Priority)).slice(0, 3);
}

function readChecks(value: unknown): Profile["checks"] {
  const source = (value ?? {}) as Partial<Record<CheckKey, CheckLevel>>;
  const read = (key: CheckKey) => (source[key] === "Fine" || source[key] === "Shaky" || source[key] === "Rough" ? source[key] : emptyProfile.checks[key]);
  return { energy: read("energy"), money: read("money"), sleep: read("sleep"), social: read("social") };
}

function readProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Profile>;
  return {
    goodDay: typeof candidate.goodDay === "string" ? candidate.goodDay.slice(0, 600) : "",
    priorities: readPriorities(candidate.priorities),
    checks: readChecks(candidate.checks),
  };
}

function readMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Message => Boolean(item && typeof item === "object" && typeof (item as Message).text === "string"))
    .map((item) => ({ isUser: Boolean(item.isUser), text: item.text.slice(0, 4000), note: typeof item.note === "string" ? item.note : undefined }))
    .slice(-120);
}

function readDays(value: unknown): DayLog {
  if (!value || typeof value !== "object") return {};
  const out: DayLog = {};
  for (const [key, ids] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(ids)) continue;
    out[key] = ids.filter((id): id is string => typeof id === "string").slice(0, 10);
  }
  return out;
}

/** The old questionnaire asked different questions, so only the parts that
 *  still mean the same thing carry over. */
const LEGACY_PRIORITIES: Record<string, Priority> = {
  energy: "Energy",
  money: "Money",
  relationships: "People",
  meaning: "Meaning",
  home: "Home",
};

function migrateLegacy(): SavedData | null {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  const saved = JSON.parse(raw) as { profile?: { vision?: string; priorities?: string[] }; completionDays?: string[]; chat?: { role?: string; text?: string }[] };
  if (!saved.profile) return null;
  const priorities = (saved.profile.priorities ?? []).map((id) => LEGACY_PRIORITIES[id]).filter(Boolean).slice(0, 3);
  const days: DayLog = {};
  for (const day of saved.completionDays ?? []) if (/^\d{4}-\d{2}-\d{2}$/.test(day)) days[day] = ["carried-over"];
  return {
    version: 2,
    profile: { goodDay: typeof saved.profile.vision === "string" ? saved.profile.vision : "", priorities, checks: emptyProfile.checks },
    days,
    msgs: readMessages((saved.chat ?? []).map((item) => ({ isUser: item.role === "user", text: item.text }))),
    modelOn: false,
  };
}

export function load(): SavedData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return migrateLegacy() ?? emptyData;
    const saved = JSON.parse(raw) as Partial<SavedData>;
    return {
      version: 2,
      profile: readProfile(saved.profile),
      days: readDays(saved.days),
      msgs: readMessages(saved.msgs),
      modelOn: Boolean(saved.modelOn),
    };
  } catch {
    // Malformed JSON or storage turned off: start fresh in memory.
    return emptyData;
  }
}

export function save(data: SavedData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Quota or private mode. The app keeps working for this session.
  }
}

export function clear() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

export function exportFile(data: SavedData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `goodlife-${dateKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
