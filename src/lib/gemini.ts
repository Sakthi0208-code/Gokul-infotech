// Server-only module: wraps every call to the Gemini API.
// Only the API route handlers import this file, so the API key never
// reaches the browser bundle.
import { ApiError, GoogleGenAI, type Content } from "@google/genai";
import type { ChatMessage, ChatReply } from "@/types/chat";
import type { ApiErrorCode, TicketAnalysis } from "@/types/ticket";
import {
  CHAT_RESPONSE_JSON_SCHEMA,
  CHAT_SYSTEM_INSTRUCTION,
  buildChatContents,
} from "./chat-prompt";
import { RESPONSE_JSON_SCHEMA, SYSTEM_INSTRUCTION, buildUserPrompt } from "./prompt";
import { parseChatReply, parseModelOutput } from "./validation";

// Free-tier models, checked against https://ai.google.dev/gemini-api/docs/pricing.
// The main model was tested live on 2026-10-25. If it is busy or fails, the
// request is tried once more on the fallback model (free-tier quotas are per
// model, so this also helps when one model's limit is reached).
// Override with GEMINI_MODEL / GEMINI_FALLBACK_MODEL (set it to "none" to disable).
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const DEFAULT_FALLBACK_MODEL = "gemini-3.1-flash-lite";
// Both attempts together must fit inside the 60-second limit of the API routes.
// The main model normally answers in 3-8 s, so it gets 15 s before we switch.
const MAIN_TIMEOUT_MS = 15_000;
const FALLBACK_TIMEOUT_MS = 25_000;

/** An error that is safe to show to the user. `message` never contains secrets. */
export class AnalysisError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const fallbackSetting = process.env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK_MODEL;
  const fallback = fallbackSetting.toLowerCase() === "none" || fallbackSetting === model ? undefined : fallbackSetting;
  return { apiKey, model, fallback };
}

// Problems another attempt cannot fix: retrying would only waste time.
const NOT_RETRYABLE = new Set<ApiErrorCode>(["MISSING_API_KEY", "GEMINI_AUTH_ERROR"]);

type Parser<T> = (raw: string | undefined) => { ok: true; value: T } | { ok: false; reason: string };

interface StructuredRequest<T> {
  contents: string | Content[];
  systemInstruction: string;
  responseJsonSchema: unknown;
  parse: Parser<T>;
  temperature: number;
}

// Shared by every feature: sends a request that must come back as JSON,
// validates it, and retries once on the fallback model if the main model
// fails for a temporary reason. Every failure becomes a safe AnalysisError.
async function generateStructured<T>(request: StructuredRequest<T>): Promise<{ value: T; model: string }> {
  const { apiKey, model, fallback } = getGeminiConfig();
  if (!apiKey) {
    throw new AnalysisError(
      "MISSING_API_KEY",
      503,
      "The server is not configured with a Gemini API key. Add GEMINI_API_KEY to .env.local (or your hosting provider's environment variables) and restart the server.",
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  try {
    return await attempt(ai, apiKey, model, request, MAIN_TIMEOUT_MS);
  } catch (error) {
    if (!(error instanceof AnalysisError) || NOT_RETRYABLE.has(error.code) || !fallback) throw error;
    console.warn(`[gemini] Main model failed (${error.code}); trying fallback model`);
    try {
      return await attempt(ai, apiKey, fallback, request, FALLBACK_TIMEOUT_MS);
    } catch {
      throw error; // report the main model's problem, which is the most useful one
    }
  }
}

async function attempt<T>(
  ai: GoogleGenAI,
  apiKey: string,
  model: string,
  request: StructuredRequest<T>,
  timeoutMs: number,
): Promise<{ value: T; model: string }> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let rawText: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: request.contents,
      config: {
        systemInstruction: request.systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: request.responseJsonSchema,
        temperature: request.temperature,
        abortSignal: controller.signal,
      },
    });
    rawText = response.text;
  } catch (error) {
    throw toAnalysisError(error, model, timedOut, apiKey, timeoutMs);
  } finally {
    clearTimeout(timer);
  }

  const parsed = request.parse(rawText);
  if (!parsed.ok) {
    // Log the reason only, never the customer text or the full model output.
    console.warn(`[gemini] Rejected model output: ${parsed.reason}`);
    throw new AnalysisError(
      "INVALID_MODEL_OUTPUT",
      502,
      "The AI returned an incomplete or invalid answer. Please try again.",
    );
  }
  return { value: parsed.value, model };
}

/** Triage one support ticket (used when the chatbot creates a ticket in /api/tickets). */
export async function analyzeTicket(ticket: string): Promise<{ analysis: TicketAnalysis; model: string }> {
  const { value, model } = await generateStructured({
    contents: buildUserPrompt(ticket),
    systemInstruction: SYSTEM_INSTRUCTION,
    responseJsonSchema: RESPONSE_JSON_SCHEMA,
    parse: parseModelOutput,
    temperature: 0.2,
  });
  return { analysis: value, model };
}

/** Produce the assistant's next chat reply (used by /api/chat). */
export async function generateChatReply(messages: ChatMessage[]): Promise<{ reply: ChatReply; model: string }> {
  const { value, model } = await generateStructured({
    contents: buildChatContents(messages),
    systemInstruction: CHAT_SYSTEM_INSTRUCTION,
    responseJsonSchema: CHAT_RESPONSE_JSON_SCHEMA,
    parse: parseChatReply,
    temperature: 0.3,
  });
  return { reply: value, model };
}

// Maps SDK and network errors to messages that are safe for the client.
function toAnalysisError(error: unknown, model: string, timedOut: boolean, apiKey: string, timeoutMs: number): AnalysisError {
  if (timedOut || (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"))) {
    return new AnalysisError(
      "TIMEOUT",
      504,
      `Gemini did not respond within ${timeoutMs / 1000} seconds. Please try again in a moment.`,
    );
  }

  if (error instanceof ApiError) {
    const status = error.status;
    console.warn(`[gemini] API error: status ${status}`);

    if (status === 429) {
      return new AnalysisError(
        "GEMINI_RATE_LIMITED",
        429,
        "The Gemini free-tier quota or rate limit was reached. Wait a minute and try again, or switch GEMINI_MODEL to a lighter model.",
      );
    }
    if (status === 401 || status === 403 || (status === 400 && /api key/i.test(error.message))) {
      return new AnalysisError(
        "GEMINI_AUTH_ERROR",
        502,
        "Gemini rejected the API key. Check that GEMINI_API_KEY is correct and active in Google AI Studio.",
      );
    }
    if (status === 404) {
      return new AnalysisError(
        "MODEL_UNAVAILABLE",
        502,
        `The configured Gemini model "${model}" is not available. Set GEMINI_MODEL to a model listed in the Gemini API docs.`,
      );
    }
    if (status >= 500) {
      return new AnalysisError(
        "GEMINI_ERROR",
        502,
        "The Gemini service is temporarily unavailable. Please try again shortly.",
      );
    }
    return new AnalysisError("GEMINI_ERROR", 502, "Gemini could not process this request. Please try again.");
  }

  // Log the error type and a short, key-redacted message to help with
  // debugging. SDK and network errors do not contain customer text.
  const name = error instanceof Error ? error.name : typeof error;
  const detail = error instanceof Error ? error.message.split(apiKey).join("[redacted]").slice(0, 200) : "";
  console.error(`[gemini] Unexpected error: ${name}${detail ? ` – ${detail}` : ""}`);
  return new AnalysisError(
    "INTERNAL_ERROR",
    500,
    "Something went wrong while contacting the AI service. Please try again.",
  );
}
