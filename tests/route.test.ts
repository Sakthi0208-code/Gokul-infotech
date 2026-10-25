// @vitest-environment node
// Tests for POST /api/analyze. analyzeTicket is mocked, so no Gemini calls happen.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { analyzeTicket } = vi.hoisted(() => ({ analyzeTicket: vi.fn() }));

vi.mock("@/lib/gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gemini")>();
  return { ...actual, analyzeTicket };
});

import { POST } from "@/app/api/analyze/route";
import { ADMIN_COOKIE, createSessionToken } from "@/lib/admin-auth";
import { AnalysisError } from "@/lib/gemini";
import { MAX_REQUESTS_PER_WINDOW, resetRateLimit } from "@/lib/rate-limit";
import { MAX_TICKET_LENGTH } from "@/lib/validation";

const validAnalysis = {
  category: "Technical Issue",
  priority: "Medium",
  sentiment: "Neutral",
  summary: "PDF export fails with an error 500.",
  suggested_reply: "Thanks for reporting this. Could you share the time the error happened?",
  recommended_action: "Reproduce the PDF export error and check server logs.",
  priority_reason: "A workaround (CSV export) exists.",
};

function adminCookie() {
  return `${ADMIN_COOKIE}=${createSessionToken()}`;
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: adminCookie(), ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("ADMIN_ACCESS_CODE", "test-admin-code");
  vi.stubEnv("ADMIN_SESSION_SECRET", "test-session-secret");
  analyzeTicket.mockReset();
  resetRateLimit();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/analyze", () => {
  it("rejects requests without an admin session", async () => {
    const res = await post({ ticket: "I cannot log in to my account." }, { cookie: "" });
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
    expect(analyzeTicket).not.toHaveBeenCalled();
  });

  it("rejects a forged session cookie", async () => {
    const res = await post({ ticket: "I cannot log in to my account." }, { cookie: `${ADMIN_COOKIE}=v1.9999999999.forged` });
    expect(res.status).toBe(401);
  });

  it("rejects an empty ticket with 400", async () => {
    const res = await post({ ticket: "" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect(analyzeTicket).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only ticket with 400", async () => {
    const res = await post({ ticket: "     \n  " });
    expect(res.status).toBe(400);
    expect(analyzeTicket).not.toHaveBeenCalled();
  });

  it("rejects a ticket over the length limit", async () => {
    const res = await post({ ticket: "x".repeat(MAX_TICKET_LENGTH + 1) });
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toMatch(/too long/i);
  });

  it("rejects an oversized request body with 413", async () => {
    const res = await post({ ticket: "x".repeat(25_000) });
    expect(res.status).toBe(413);
  });

  it("rejects invalid JSON", async () => {
    const res = await post("not json");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("rejects a body without a ticket string", async () => {
    const res = await post({ message: "hello there friend" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("passes trimmed, valid input to the analyzer and returns the analysis", async () => {
    analyzeTicket.mockResolvedValue({ analysis: validAnalysis, model: "gemini-test" });
    const res = await post({ ticket: "   PDF export shows error 500.   " });

    expect(res.status).toBe(200);
    expect(analyzeTicket).toHaveBeenCalledWith("PDF export shows error 500.");
    expect(await res.json()).toEqual({ analysis: validAnalysis, model: "gemini-test" });
  });

  it("returns a clear 503 when the API key is missing", async () => {
    analyzeTicket.mockRejectedValue(
      new AnalysisError("MISSING_API_KEY", 503, "The server is not configured with a Gemini API key."),
    );
    const res = await post({ ticket: "I cannot log in to my account." });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toEqual({
      code: "MISSING_API_KEY",
      message: "The server is not configured with a Gemini API key.",
    });
  });

  it("passes Gemini rate-limit errors through as 429", async () => {
    analyzeTicket.mockRejectedValue(new AnalysisError("GEMINI_RATE_LIMITED", 429, "Quota reached."));
    const res = await post({ ticket: "I cannot log in to my account." });
    expect(res.status).toBe(429);
  });

  it("hides details of unexpected errors", async () => {
    analyzeTicket.mockRejectedValue(new Error("db password=hunter2 at line 42"));
    const res = await post({ ticket: "I cannot log in to my account." });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("hunter2");
  });

  it("rate limits repeated requests from the same client", async () => {
    analyzeTicket.mockResolvedValue({ analysis: validAnalysis, model: "gemini-test" });
    const headers = { "x-forwarded-for": "203.0.113.7" };
    for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
      expect((await post({ ticket: "I cannot log in to my account." }, headers)).status).toBe(200);
    }
    const res = await post({ ticket: "I cannot log in to my account." }, headers);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});
