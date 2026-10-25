// What the assistant decided to do with the conversation.
// - troubleshooting: gave steps the customer can try
// - needs_info: asked clarifying questions before suggesting fixes
// - escalate: a human should take over (outage, billing, security, repeated failures)
export const CHAT_STATUSES = ["troubleshooting", "needs_info", "escalate"] as const;
export type ChatStatus = (typeof CHAT_STATUSES)[number];

export interface ChatReply {
  message: string;
  steps: string[];
  status: ChatStatus;
  escalation_reason: string;
}

// Messages sent from the browser to /api/chat and /api/tickets.
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSuccessResponse {
  reply: ChatReply;
  model: string;
}

export interface ContactDetails {
  name?: string;
  email?: string;
}
