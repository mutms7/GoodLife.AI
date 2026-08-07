/* Reads playbook.md into topics the coach can be pointed at.
 *
 * Routing is entirely the model's call. Nothing here matches keywords, and
 * there is no phrase list underneath it: the model reads every topic's `When:`
 * line and names the one that fits, including `crisis`. Dependency-free so the
 * tests can parse the real file. */

export type Topic = {
  id: string;
  /** The one-line description the model chooses between. */
  when: string;
  /** Injected into the answering prompt once this topic is chosen. */
  notes: string[];
  /** Present means the model routes here and then this is sent verbatim, so the
   *  topic's own notes never reach the answering prompt. */
  fixedReply?: string;
  /** Appended verbatim after the model finishes. */
  sayAfter?: string;
};

const FIELDS = ["when", "fixed reply", "say after"] as const;

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
      current = { id: heading[1].trim().toLowerCase(), when: "", notes: [] };
      topics.push(current);
      continue;
    }
    if (!current) continue; // Preamble above the first topic is documentation.

    const field = fieldKey(line);
    if (field) {
      if (field.key === "when") current.when = field.value;
      if (field.key === "fixed reply") current.fixedReply = field.value;
      if (field.key === "say after") current.sayAfter = field.value;
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

export type ReplySource = "model" | "crisis" | "model-off" | "model-failed" | "model-blocked";

/** The note under a coach reply. It is a designed element, not debug output,
 *  so every reply carries one. */
export function noteFor(topic: Topic | undefined, source: ReplySource): string {
  if (source === "crisis" || topic?.fixedReply) return "The model read this as crisis language and routed it here. The reply is fixed text, not something the model wrote.";
  if (source === "model-off") return "The coach needs the local model, and it isn't running yet.";
  if (source === "model-failed") return "The model didn't finish that one. Nothing was sent anywhere, so you can just try again.";
  if (source === "model-blocked") return "That reply started recommending a medication, so it was stopped before you saw it. Nothing was sent anywhere.";
  const grounded = topic ? GROUNDED_NOTE[topic.id] : undefined;
  return grounded
    ? `Local model on your device, grounded in ${grounded}.`
    : "Answered by the local model, running on your device.";
}
