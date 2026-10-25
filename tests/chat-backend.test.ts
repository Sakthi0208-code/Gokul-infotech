// @vitest-environment node
// Tests for the chat and escalation backend. Gemini calls are mocked.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { generateChatReply } = vi.hoisted(() => ({ generateChatReply: vi.fn() }));

vi.mock("@/lib/gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gemini")>();
  return { ...actual, generateChatReply };
});

import { POST as chatPOST } from "@/app/api/chat/route";
import { AnalysisError } from "@/lib/gemini";
import { resetRateLimit } from "@/lib/rate-limit";
import { MAX_CHAT_MESSAGE_LENGTH, chatRequestSchema, parseChatReply, validateRequest } from "@/lib/validation";

const reply = {
  message: "Sorry you're having trouble signing in. Let's try a few things.",
  steps: ["Clear your browser cache.", "Try a private window."],
  status: "troubleshooting",
  escalation_reason: "",
};

const conversation = [
  { role: "user", content: "I can't log in to my account." },
  { role: "assistant", content: "Try clearing your cache.\n1. Clear cache" },
  { role: "user", content: "I tried that, but the problem is still happening." },
];

function request(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  generateChatReply.mockReset();
  resetRateLimit();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("chat request validation", () => {
  it("accepts a valid conversation", () => {
    expect(validateRequest(chatRequestSchema, { messages: conversation }).ok).toBe(true);
  });

  it("rejects an empty conversation", () => {
    expect(validateRequest(chatRequestSchema, { messages: [] }).ok).toBe(false);
  });

  it("rejects a conversation that ends with the assistant", () => {
    const result = validateRequest(chatRequestSchema, { messages: conversation.slice(0, 2) });
    expect(result).toEqual({ ok: false, message: "The last message must come from the customer." });
  });

  it("rejects a conversation that starts with the assistant", () => {
    expect(validateRequest(chatRequestSchema, { messages: conversation.slice(1) }).ok).toBe(false);
  });

  it("rejects whitespace-only and over-long messages", () => {
    expect(validateRequest(chatRequestSchema, { messages: [{ role: "user", content: "   " }] }).ok).toBe(false);
    expect(
      validateRequest(chatRequestSchema, { messages: [{ role: "user", content: "a".repeat(MAX_CHAT_MESSAGE_LENGTH + 1) }] }).ok,
    ).toBe(false);
  });

  it("rejects unknown roles", () => {
    expect(validateRequest(chatRequestSchema, { messages: [{ role: "system", content: "hello" }] }).ok).toBe(false);
  });
});

describe("parseChatReply", () => {
  it("accepts a valid reply", () => {
    expect(parseChatReply(JSON.stringify(reply))).toEqual({ ok: true, value: reply });
  });

  it("rejects malformed JSON and invalid status", () => {
    expect(parseChatReply("{oops").ok).toBe(false);
    expect(parseChatReply(JSON.stringify({ ...reply, status: "done" })).ok).toBe(false);
  });

  it("rejects too many steps", () => {
    expect(parseChatReply(JSON.stringify({ ...reply, steps: Array(7).fill("Step") })).ok).toBe(false);
  });

  it("fills a missing escalation reason and clears it when not escalating", () => {
    const escalated = parseChatReply(JSON.stringify({ ...reply, status: "escalate", escalation_reason: "" }));
    expect(escalated.ok && escalated.value.escalation_reason).toMatch(/could not resolve/);

    const normal = parseChatReply(JSON.stringify({ ...reply, escalation_reason: "leftover" }));
    expect(normal.ok && normal.value.escalation_reason).toBe("");
  });
});

describe("POST /api/chat", () => {
  it("returns the assistant reply", async () => {
    generateChatReply.mockResolvedValue({ reply, model: "gemini-test" });
    const res = await chatPOST(request("http://localhost/api/chat", { messages: conversation }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reply, model: "gemini-test" });
    expect(generateChatReply).toHaveBeenCalledWith(conversation);
  });

  it("rejects invalid bodies without calling Gemini", async () => {
    const bad = await chatPOST(request("http://localhost/api/chat", "nope"));
    expect(bad.status).toBe(400);
    const empty = await chatPOST(request("http://localhost/api/chat", { messages: [] }));
    expect(empty.status).toBe(400);
    expect(generateChatReply).not.toHaveBeenCalled();
  });

  it("returns 503 with a setup message when the key is missing", async () => {
    generateChatReply.mockRejectedValue(new AnalysisError("MISSING_API_KEY", 503, "No key configured."));
    const res = await chatPOST(request("http://localhost/api/chat", { messages: conversation }));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("MISSING_API_KEY");
  });

  it("hides unexpected error details", async () => {
    generateChatReply.mockRejectedValue(new Error("secret internal detail"));
    const res = await chatPOST(request("http://localhost/api/chat", { messages: conversation }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret internal detail");
  });
});
