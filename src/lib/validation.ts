import { z } from "zod";
import { CHAT_STATUSES, type ChatReply } from "@/types/chat";
import { TICKET_STATUSES } from "@/types/support-ticket";
import { CATEGORIES, PRIORITIES, SENTIMENTS, type TicketAnalysis } from "@/types/ticket";

export const MAX_TICKET_LENGTH = 5000;
const MIN_TICKET_LENGTH = 10;

// ---------- Incoming ticket text (used by both the form and the API) ----------

export type TicketTextResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

export function validateTicketText(input: unknown): TicketTextResult {
  if (typeof input !== "string") {
    return { ok: false, message: "Ticket text must be a string." };
  }
  const value = input.trim();
  if (value.length === 0) {
    return { ok: false, message: "Please enter the customer's message before analyzing." };
  }
  if (value.length < MIN_TICKET_LENGTH) {
    return {
      ok: false,
      message: `The ticket is too short to analyze. Please enter at least ${MIN_TICKET_LENGTH} characters.`,
    };
  }
  if (value.length > MAX_TICKET_LENGTH) {
    return {
      ok: false,
      message: `The ticket is too long (${value.length.toLocaleString()} characters). The limit is ${MAX_TICKET_LENGTH.toLocaleString()}.`,
    };
  }
  return { ok: true, value };
}

// The API body must look like: { "ticket": "..." }
export const analyzeRequestSchema = z.object({
  ticket: z.string(),
});

// ---------- Model output ----------

const text = (max: number) => z.string().trim().min(1).max(max);

const ticketAnalysisSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  sentiment: z.enum(SENTIMENTS),
  summary: text(600),
  suggested_reply: text(2500),
  recommended_action: text(800),
  priority_reason: text(600),
});

export type ModelOutputResult =
  | { ok: true; value: TicketAnalysis }
  | { ok: false; reason: string };

// Parses the raw text Gemini returned and checks every field.
// Anything missing, extra-long, or outside the allowed lists is rejected.
export function parseModelOutput(raw: string | undefined | null): ModelOutputResult {
  if (!raw || raw.trim().length === 0) {
    return { ok: false, reason: "empty response" };
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "response was not valid JSON" };
  }

  const result = ticketAnalysisSchema.safeParse(data);
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join(".") || "(root)");
    return { ok: false, reason: `invalid fields: ${[...new Set(fields)].join(", ")}` };
  }
  return { ok: true, value: result.data };
}

// ---------- Chat ----------

export const MAX_CHAT_MESSAGE_LENGTH = 2000;
export const MAX_CHAT_MESSAGES = 20;
const MAX_CHAT_TOTAL_LENGTH = 15_000;

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z
    .string()
    .trim()
    .min(1, "Messages cannot be empty.")
    .max(MAX_CHAT_MESSAGE_LENGTH, `Each message must be at most ${MAX_CHAT_MESSAGE_LENGTH.toLocaleString()} characters.`),
});

const chatHistorySchema = z
  .array(chatMessageSchema)
  .min(1, "Send at least one message.")
  .max(MAX_CHAT_MESSAGES, `The conversation is too long. Please start a new chat.`)
  .refine((msgs) => msgs[0]?.role === "user", "The conversation must start with a customer message.")
  .refine(
    (msgs) => msgs.reduce((n, m) => n + m.content.length, 0) <= MAX_CHAT_TOTAL_LENGTH,
    "The conversation is too long. Please start a new chat.",
  );

export const chatRequestSchema = z.object({
  messages: chatHistorySchema.refine(
    (msgs) => msgs[msgs.length - 1]?.role === "user",
    "The last message must come from the customer.",
  ),
});

export const createTicketSchema = z.object({
  messages: chatHistorySchema,
  escalation_reason: z.string().trim().max(500).optional(),
  contact: z
    .object({
      name: z.string().trim().max(100, "Name must be at most 100 characters.").optional(),
      email: z
        .union([z.literal(""), z.email("Please enter a valid email address.").max(200)])
        .optional(),
    })
    .optional(),
});

export type RequestResult<T> = { ok: true; value: T } | { ok: false; message: string };

// Returns the first readable validation message, or the parsed value.
export function validateRequest<T>(schema: z.ZodType<T>, data: unknown): RequestResult<T> {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, value: result.data };
  const issue = result.error.issues[0];
  const generic = issue?.code === "invalid_type" || issue?.code === "invalid_value" || issue?.code === "unrecognized_keys";
  return { ok: false, message: generic || !issue ? "The request body has an invalid format." : issue.message };
}


export const updateTicketSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    resolution: z.string().trim().max(2000, "The resolution note must be at most 2,000 characters.").optional(),
  })
  .refine((v) => v.status !== undefined || v.resolution !== undefined, "Nothing to update.")
  .refine((v) => v.status !== "resolved" || (v.resolution ?? "").length > 0, {
    message: "Add a resolution note for the customer before marking the ticket resolved.",
    path: ["resolution"],
  });

const chatReplySchema = z
  .object({
    message: text(1500),
    steps: z.array(text(400)).max(6),
    status: z.enum(CHAT_STATUSES),
    escalation_reason: z.string().trim().max(500),
  })
  // A missing reason should not throw away an otherwise good reply.
  .transform((r) => ({
    ...r,
    escalation_reason:
      r.status === "escalate"
        ? r.escalation_reason || "The assistant could not resolve this issue."
        : "",
  }));

export function parseChatReply(raw: string | undefined | null): { ok: true; value: ChatReply } | { ok: false; reason: string } {
  if (!raw || raw.trim().length === 0) return { ok: false, reason: "empty response" };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "response was not valid JSON" };
  }
  const result = chatReplySchema.safeParse(data);
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join(".") || "(root)");
    return { ok: false, reason: `invalid fields: ${[...new Set(fields)].join(", ")}` };
  }
  return { ok: true, value: result.data };
}
