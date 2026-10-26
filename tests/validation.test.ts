// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseModelOutput } from "@/lib/validation";

const validAnalysis = {
  category: "Account Access",
  priority: "High",
  sentiment: "Negative",
  summary: "Customer cannot log in after several password resets.",
  suggested_reply: "I'm sorry you're having trouble signing in. Could you confirm the email on the account?",
  recommended_action: "Investigate the password reset flow for this account.",
  priority_reason: "The customer is fully blocked from using the service.",
};

describe("parseModelOutput", () => {
  it("accepts a valid analysis", () => {
    const result = parseModelOutput(JSON.stringify(validAnalysis));
    expect(result).toEqual({ ok: true, value: validAnalysis });
  });

  it("rejects empty output", () => {
    expect(parseModelOutput("").ok).toBe(false);
    expect(parseModelOutput(undefined).ok).toBe(false);
  });

  it("rejects malformed JSON", () => {
    const result = parseModelOutput('{"category": "Billing", ');
    expect(result).toEqual({ ok: false, reason: "response was not valid JSON" });
  });

  it("rejects JSON that is not an object", () => {
    expect(parseModelOutput('"just a string"').ok).toBe(false);
  });

  it("rejects an invalid category", () => {
    const result = parseModelOutput(JSON.stringify({ ...validAnalysis, category: "Shipping" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("category");
  });

  it("rejects an invalid priority", () => {
    const result = parseModelOutput(JSON.stringify({ ...validAnalysis, priority: "Urgent" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("priority");
  });

  it("rejects an invalid sentiment", () => {
    expect(parseModelOutput(JSON.stringify({ ...validAnalysis, sentiment: "Angry" })).ok).toBe(false);
  });

  it("rejects missing required fields", () => {
    const { suggested_reply: _omit, ...rest } = validAnalysis;
    void _omit;
    const result = parseModelOutput(JSON.stringify(rest));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("suggested_reply");
  });

  it("rejects empty string fields", () => {
    expect(parseModelOutput(JSON.stringify({ ...validAnalysis, summary: "   " })).ok).toBe(false);
  });

  it("strips unknown extra fields", () => {
    const result = parseModelOutput(JSON.stringify({ ...validAnalysis, secret: "x" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).not.toHaveProperty("secret");
  });
});
