import type { Conversation, Message } from "@/lib/storage";

const PREVIEW_WORDS = 7;
export const NEW_CONVERSATION_LABEL = "New conversation";

function firstWords(text: string, limit = PREVIEW_WORDS): string {
  const words = text.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  const preview = words.slice(0, limit).join(" ");
  return words.length > limit ? `${preview}…` : preview;
}

/** Conversation names come from the coach, not from the person's prompt. */
export function responseTitle(messages: Message[]): string {
  const response = messages.find((message) => !message.isUser && message.text.trim());
  return response ? firstWords(response.text) : NEW_CONVERSATION_LABEL;
}

export function conversationLabel(conversation: Conversation): string {
  return responseTitle(conversation.msgs);
}

export function dayStarter(greeting: string, habitCount: number): string {
  if (habitCount <= 0) return `${greeting}. You don't have any active habits yet. Add one of your own to shape today's plan.`;
  if (habitCount === 1) return `${greeting}. Here's one small habit for today. It's small on purpose, and you can add more whenever you're ready.`;
  if (habitCount === 2) return `${greeting}. Here are two small habits for today. Both are small on purpose, and you can add another whenever you want.`;
  return `${greeting}. Here's what I'd try today. All three are small on purpose, and the shuffle button swaps one out.`;
}
