/* Reads playbook.md into topics the coach can be pointed at.
 *
 * The model picks which topic fits a message, so nothing here matches keywords
 * to decide that. The one exception is `Safety net:`, which is a literal-phrase
 * floor under the model's judgement for the cases where being wrong is
 * expensive. Dependency-free so the tests can parse the real file. */

export type Topic = {
  id: string;
  /** The one-line description the model chooses between. */
  when: string;
  /** Injected into the answering prompt once this topic is chosen. */
  notes: string[];
  /** Literal phrases checked before the model runs. */
  safetyNet: string[];
  /** Phrases that cancel a safety-net hit, for idioms that share its wording.
   *  Cancelling doesn't drop the message, it hands the call to the model. */
  except: string[];
  /** Present means the model is skipped and this is sent verbatim. */
  fixedReply?: string;
  /** Appended verbatim after the model finishes. */
  sayAfter?: string;
};

const FIELDS = ["when", "safety net", "except", "fixed reply", "say after"] as const;

function phraseList(value: string): string[] {
  return value.split(",").map((phrase) => phrase.trim().toLowerCase()).filter(Boolean);
}

/** Collapses punctuation to single spaces and pads the ends, so `includes` on a
 *  padded phrase behaves like a whole-word match. */
function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9']+/g, " ").replace(/\s+/g, " ").trim()} `;
}

function fieldKey(line: string): { key: string; value: string } | null {
  const match = /^([A-Za-z ]+):\s*(.*)$/.exec(line);
  if (!match) return null;
  const key = match[1].trim().toLowerCase();
  return FIELDS.includes(key as (typeof FIELDS)[number]) ? { key, value: match[2].trim() } : null;
}

export function parsePlaybook(markdown: string): Topic[] {
  const topics: Topic[] = [];
  let current: Topic | null = null;

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();

    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      current = { id: heading[1].trim().toLowerCase(), when: "", notes: [], safetyNet: [], except: [] };
      topics.push(current);
      continue;
    }
    if (!current) continue; // Preamble above the first topic is documentation.

    const field = fieldKey(line);
    if (field) {
      if (field.key === "when") current.when = field.value;
      if (field.key === "fixed reply") current.fixedReply = field.value;
      if (field.key === "say after") current.sayAfter = field.value;
      if (field.key === "safety net") current.safetyNet = phraseList(field.value);
      if (field.key === "except") current.except = phraseList(field.value);
      continue;
    }

    const bullet = /^-\s+(.+)$/.exec(line);
    if (bullet) current.notes.push(bullet[1].trim());
  }

  return topics.filter((topic) => topic.when.length > 0);
}

export function findTopic(topics: Topic[], id: string): Topic | undefined {
  const wanted = id.trim().toLowerCase();
  return topics.find((topic) => topic.id === wanted);
}

/** Always exists, so callers never have to handle a missing topic. */
export function fallbackTopic(topics: Topic[]): Topic {
  return findTopic(topics, "general") ?? topics[topics.length - 1];
}

/** The list the model chooses from. Ids first so a one-word answer is the
 *  easiest thing for a small model to produce. */
export function topicMenu(topics: Topic[]): string {
  return topics.map((topic) => `${topic.id}: ${topic.when}`).join("\n");
}

/** Literal-phrase check on whole-word boundaries, so "kms" doesn't fire inside
 *  another word. Runs before the model, and only for topics that declare it. An
 *  `Except:` hit cancels the match and lets the model make the call instead. */
export function matchSafetyNet(topics: Topic[], message: string): Topic | undefined {
  const text = normalize(message);
  const hits = (phrases: string[]) => phrases.some((phrase) => text.includes(normalize(phrase)));
  return topics.find((topic) => hits(topic.safetyNet) && !hits(topic.except));
}

/** Reads the model's answer to the topic question. Small models like to add a
 *  sentence around the word, so this looks for any known id rather than
 *  demanding an exact match. */
export function readTopicChoice(topics: Topic[], output: string): Topic {
  const text = output.toLowerCase();
  const exact = findTopic(topics, text.trim());
  if (exact) return exact;
  const mentioned = topics.filter((topic) => new RegExp(`\\b${topic.id}\\b`).test(text));
  // One clear mention is a choice. Several is the model listing options.
  return mentioned.length === 1 ? mentioned[0] : fallbackTopic(topics);
}

const GROUNDED_NOTE: Record<string, string> = {
  distress: "reviewed guidance for heavier conversations",
  money: "reviewed money guidance",
  health: "reviewed health guidance",
  housing: "reviewed housing guidance",
};

export type ReplySource = "model" | "crisis" | "model-off" | "model-failed";

/** The note under a coach reply. It is a designed element, not debug output,
 *  so every reply carries one. */
export function noteFor(topic: Topic | undefined, source: ReplySource): string {
  if (source === "crisis" || topic?.fixedReply) return "Crisis language, so this is a fixed response. The model was not involved.";
  if (source === "model-off") return "The coach needs the local model, and it isn't running yet.";
  if (source === "model-failed") return "The model didn't finish that one. Nothing was sent anywhere, so you can just try again.";
  const grounded = topic ? GROUNDED_NOTE[topic.id] : undefined;
  return grounded
    ? `Local model on your device, grounded in ${grounded}.`
    : "Answered by the local model, running on your device.";
}
