import type { ChatMessage } from "@/types/chat";
import { MAX_TICKET_LENGTH } from "./validation";

const HEADER = "Customer conversation with the website support assistant:\n\n";

function formatTranscript(messages: ChatMessage[]): string {
  return messages.map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.content.trim()}`).join("\n\n");
}

/**
 * Turns the chat into a single "ticket" text for the triage engine.
 * Keeps the most recent messages if the conversation is longer than the ticket limit.
 */
export function buildTicketFromConversation(messages: ChatMessage[]): string {
  let kept = [...messages];
  let text = HEADER + formatTranscript(kept);
  while (text.length > MAX_TICKET_LENGTH && kept.length > 1) {
    kept = kept.slice(1);
    text = HEADER + "[Earlier messages omitted]\n\n" + formatTranscript(kept);
  }
  return text.slice(0, MAX_TICKET_LENGTH);
}
