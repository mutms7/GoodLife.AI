import { PRIORITIES, emptyProfile, type CheckKey, type CheckLevel, type Priority, type Profile } from "@/lib/advice";
import { dateKey, type DayLog } from "@/lib/days";

/* The date and day-log helpers live in days.ts so the tests can reach them
 * without the bundler. Re-exported here because this is where callers look. */
export { dateKey, daysBetween, recentDays, shiftDays, streakFrom, type DayLog, type RecentDay } from "@/lib/days";

/** `retryable` marks a reply the model failed to finish, so the thread can
 *  offer another attempt instead of leaving a dead end. */
export type Message = { isUser: boolean; text: string; note?: string; retryable?: boolean };

export type Conversation = {
  id: string;
  date: string;
  title: string;
  msgs: Message[];
};

export type Habit = {
  id: string;
  actionId?: string;
  title: string;
  paused: boolean;
};

export type FontSize = "small" | "medium" | "large";

export type SavedData = {
  version: 4;
  updatedAt: number;
  profile: Profile | null;
  days: DayLog;
  /** Legacy active-thread mirror. New writes are kept in conversations. */
  msgs: Message[];
  conversations: Conversation[];
  activeConversationId: string;
  modelOn: boolean;
  /** Action ids pushed aside for a given day, so a swap survives a reload.
   *
   *  The only new state v3 adds. Which three were shown on a day, and which
   *  day of the seven-day sequence you're on, are both recomputed from the
   *  profile plus these, so there's nothing stored to drift out of sync. */
  swaps: DayLog;
  habits: Habit[];
  settings: { fontSize: FontSize; habitsConfigured: boolean };
};

const KEY = "goodlife-local-v4";
const LEGACY_CLAIM_KEY = "goodlife-legacy-claimed";
const LEGACY_KEYS = ["goodlife-local-v3", "goodlife-local-v2", "goodlife-local-v1"];
function storageKey(userId?: string) { return userId ? `${KEY}-${encodeURIComponent(userId)}` : KEY; }

const newConversation = (date = dateKey()): Conversation => ({ id: `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date, title: "New conversation", msgs: [] });

export function freshData(): SavedData {
  const conversation = newConversation();
  return { version: 4, updatedAt: 0, profile: null, days: {}, msgs: [], conversations: [conversation], activeConversationId: conversation.id, modelOn: false, swaps: {}, habits: [], settings: { fontSize: "medium", habitsConfigured: false } };
}

export const emptyData: SavedData = freshData();

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

function readConversations(value: unknown): Conversation[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id ? item.id.slice(0, 120) : `conversation-${index}`,
      date: typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : dateKey(),
      title: typeof item.title === "string" && item.title ? item.title.slice(0, 120) : "Conversation",
      msgs: readMessages(item.msgs),
    }))
    .slice(-100);
}

function readHabits(value: unknown): Habit[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id ? item.id.slice(0, 120) : `habit-${index}`,
      actionId: typeof item.actionId === "string" ? item.actionId.slice(0, 120) : undefined,
      title: typeof item.title === "string" && item.title.trim() ? item.title.slice(0, 200) : "Habit",
      paused: item.paused === true,
    }))
    .slice(0, 100);
}

function readFontSize(value: unknown): FontSize {
  return value === "small" || value === "large" ? value : "medium";
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
      if (saved.version === 4 || saved.version === 3 || saved.msgs || saved.days) {
        const conversations = readConversations(saved.conversations);
        const legacyMsgs = readMessages(saved.msgs);
        if (conversations.length === 0) conversations.push({ ...newConversation(), msgs: legacyMsgs });
        const activeConversationId = typeof saved.activeConversationId === "string" && conversations.some((item) => item.id === saved.activeConversationId)
          ? saved.activeConversationId
          : conversations[conversations.length - 1].id;
        return {
          ...emptyData,
          profile: readProfile(saved.profile),
          days: readDays(saved.days),
          msgs: conversations.find((item) => item.id === activeConversationId)?.msgs ?? legacyMsgs,
          conversations,
          activeConversationId,
          modelOn: Boolean(saved.modelOn),
          swaps: readDays(saved.swaps),
          habits: readHabits(saved.habits),
          settings: { fontSize: readFontSize((saved.settings as { fontSize?: unknown } | undefined)?.fontSize), habitsConfigured: (saved.settings as { habitsConfigured?: unknown } | undefined)?.habitsConfigured === true },
        };
      }
      const v1 = saved as { profile?: { vision?: string; priorities?: string[] }; completionDays?: string[]; chat?: { role?: string; text?: string }[] };
      if (!v1.profile) continue;
      const priorities = (v1.profile.priorities ?? []).map((id) => LEGACY_PRIORITIES[id]).filter(Boolean).slice(0, 3);
      const days: DayLog = {};
      for (const day of v1.completionDays ?? []) if (/^\d{4}-\d{2}-\d{2}$/.test(day)) days[day] = ["carried-over"];
      const migratedMessages = readMessages((v1.chat ?? []).map((item) => ({ isUser: item.role === "user", text: item.text })));
      const migratedConversation = { ...newConversation(), msgs: migratedMessages };
      return {
        ...emptyData,
        profile: { goodDay: typeof v1.profile.vision === "string" ? v1.profile.vision : "", priorities, checks: emptyProfile.checks },
        days,
        msgs: migratedMessages,
        conversations: [migratedConversation],
        activeConversationId: migratedConversation.id,
      };
    } catch {
      // Try the next key rather than losing everything to one bad blob.
    }
  }
  return null;
}

export function load(userId?: string): SavedData {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) {
      if (userId && !localStorage.getItem(LEGACY_CLAIM_KEY)) {
        const unscoped = localStorage.getItem(KEY);
        const migrated = unscoped ? JSON.parse(unscoped) as Partial<SavedData> : migrateLegacy();
        if (migrated) {
          localStorage.setItem(LEGACY_CLAIM_KEY, userId);
          save(migrated as SavedData, userId);
          return load(userId);
        }
      }
      return emptyData;
    }
    const saved = JSON.parse(raw) as Partial<SavedData>;
    const conversations = readConversations(saved.conversations);
    const legacyMsgs = readMessages(saved.msgs);
    if (conversations.length === 0) conversations.push({ ...newConversation(), msgs: legacyMsgs });
    const activeConversationId = typeof saved.activeConversationId === "string" && conversations.some((item) => item.id === saved.activeConversationId)
      ? saved.activeConversationId
      : conversations[conversations.length - 1].id;
    return {
      version: 4,
      updatedAt: typeof saved.updatedAt === "number" && Number.isFinite(saved.updatedAt) ? saved.updatedAt : 0,
      profile: readProfile(saved.profile),
      days: readDays(saved.days),
      msgs: conversations.find((item) => item.id === activeConversationId)?.msgs ?? legacyMsgs,
      conversations,
      activeConversationId,
      modelOn: Boolean(saved.modelOn),
      swaps: readDays(saved.swaps),
      habits: readHabits(saved.habits),
      settings: { fontSize: readFontSize((saved.settings as { fontSize?: unknown } | undefined)?.fontSize), habitsConfigured: (saved.settings as { habitsConfigured?: unknown } | undefined)?.habitsConfigured === true },
    };
  } catch {
    // Malformed JSON or storage turned off: start fresh in memory.
    return emptyData;
  }
}

export function save(data: SavedData, userId?: string) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(data));
  } catch {
    // Quota or private mode. The app keeps working for this session.
  }
}

export function clear(userId?: string) {
  try {
    localStorage.removeItem(storageKey(userId));
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
