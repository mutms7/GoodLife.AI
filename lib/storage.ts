import { PRIORITIES, emptyProfile, type CheckKey, type CheckLevel, type Priority, type Profile } from "@/lib/advice";
import { dateKey, type DayLog } from "@/lib/days";

/* The date and day-log helpers live in days.ts so the tests can reach them
 * without the bundler. Re-exported here because this is where callers look. */
export { dateKey, daysBetween, recentDays, shiftDays, streakFrom, type DayLog, type RecentDay } from "@/lib/days";

/** `retryable` marks a reply the model failed to finish, so the thread can
 *  offer another attempt instead of leaving a dead end. */
export type Message = { isUser: boolean; text: string; note?: string; retryable?: boolean };

export type SavedData = {
  version: 3;
  profile: Profile | null;
  days: DayLog;
  msgs: Message[];
  modelOn: boolean;
  /** Action ids pushed aside for a given day, so a swap survives a reload.
   *
   *  The only new state v3 adds. Which three were shown on a day, and which
   *  day of the seven-day sequence you're on, are both recomputed from the
   *  profile plus these, so there's nothing stored to drift out of sync. */
  swaps: DayLog;
};

const KEY = "goodlife-local-v3";
const LEGACY_KEYS = ["goodlife-local-v2", "goodlife-local-v1"];

export const emptyData: SavedData = { version: 3, profile: null, days: {}, msgs: [], modelOn: false, swaps: {} };

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
    .map((item) => ({ isUser: Boolean(item.isUser), text: item.text.slice(0, 4000), note: typeof item.note === "string" ? item.note : undefined, retryable: item.retryable === true }))
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

/** v2 stored everything v3 does except swaps, so it reads straight through.
 *  v1 asked different questions. */
function migrateLegacy(): SavedData | null {
  for (const key of LEGACY_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const saved = JSON.parse(raw) as Record<string, unknown>;
      if (saved.version === 2 || saved.msgs || saved.days) {
        return {
          ...emptyData,
          profile: readProfile(saved.profile),
          days: readDays(saved.days),
          msgs: readMessages(saved.msgs),
          modelOn: Boolean(saved.modelOn),
        };
      }
      const v1 = saved as { profile?: { vision?: string; priorities?: string[] }; completionDays?: string[]; chat?: { role?: string; text?: string }[] };
      if (!v1.profile) continue;
      const priorities = (v1.profile.priorities ?? []).map((id) => LEGACY_PRIORITIES[id]).filter(Boolean).slice(0, 3);
      const days: DayLog = {};
      for (const day of v1.completionDays ?? []) if (/^\d{4}-\d{2}-\d{2}$/.test(day)) days[day] = ["carried-over"];
      return {
        ...emptyData,
        profile: { goodDay: typeof v1.profile.vision === "string" ? v1.profile.vision : "", priorities, checks: emptyProfile.checks },
        days,
        msgs: readMessages((v1.chat ?? []).map((item) => ({ isUser: item.role === "user", text: item.text }))),
      };
    } catch {
      // Try the next key rather than losing everything to one bad blob.
    }
  }
  return null;
}

export function load(): SavedData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return migrateLegacy() ?? emptyData;
    const saved = JSON.parse(raw) as Partial<SavedData>;
    return {
      version: 3,
      profile: readProfile(saved.profile),
      days: readDays(saved.days),
      msgs: readMessages(saved.msgs),
      modelOn: Boolean(saved.modelOn),
      swaps: readDays(saved.swaps),
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
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
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
