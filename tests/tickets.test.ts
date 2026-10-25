// @vitest-environment node
// Tests for ticket storage and the /api/tickets routes. Gemini is mocked and
// tickets are written to a temporary file, never to data/tickets.json.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { analyzeTicket } = vi.hoisted(() => ({ analyzeTicket: vi.fn() }));
vi.mock("@/lib/gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gemini")>();
  return { ...actual, analyzeTicket };
});

import { GET as getStatus, PATCH as patchTicket } from "@/app/api/tickets/[id]/route";
import { GET as listRoute, POST as createRoute } from "@/app/api/tickets/route";
import { ADMIN_COOKIE, createSessionToken } from "@/lib/admin-auth";
import { buildTicketFromConversation } from "@/lib/conversation";
import { AnalysisError } from "@/lib/gemini";
import { resetRateLimit } from "@/lib/rate-limit";
import { TICKET_ID_PATTERN, createTicket, getTicket, listTickets, updateTicket } from "@/lib/ticket-store";
import { MAX_TICKET_LENGTH } from "@/lib/validation";
import type { ChatMessage } from "@/types/chat";
import type { TicketAnalysis } from "@/types/ticket";

const analysis: TicketAnalysis = {
  category: "Technical Issue",
  priority: "High",
  sentiment: "Negative",
  summary: "Fleet tracker stopped reporting location.",
  suggested_reply: "We're sorry. Our team is checking the tracker connection.",
  recommended_action: "Check the device's last connection and SIM status.",
  priority_reason: "The customer cannot see live vehicle locations.",
};

const conversation: ChatMessage[] = [
  { role: "user", content: "My fleet tracker stopped updating." },
  { role: "assistant", content: "Please restart the device.\n1. Restart" },
  { role: "user", content: "I tried that, but the problem is still happening." },
];

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "gi-tickets-"));
  vi.stubEnv("TICKETS_FILE", path.join(dir, "tickets.json"));
  vi.stubEnv("ADMIN_ACCESS_CODE", "test-code");
  vi.stubEnv("ADMIN_SESSION_SECRET", "test-secret");
  analyzeTicket.mockReset();
  resetRateLimit();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

const admin = () => ({ cookie: `${ADMIN_COOKIE}=${createSessionToken()}` });

function req(url: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function newTicketInput(priority: TicketAnalysis["priority"] = "High") {
  return { customer: { name: "Priya", email: "" }, analysis: { ...analysis, priority }, escalationReason: "", transcript: conversation, model: "test" };
}

describe("buildTicketFromConversation", () => {
  it("labels each speaker", () => {
    const text = buildTicketFromConversation(conversation);
    expect(text).toContain("Customer: My fleet tracker stopped updating.");
    expect(text).toContain("Assistant: Please restart the device.");
  });

  it("keeps the newest messages when the conversation is too long", () => {
    const long: ChatMessage[] = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `message ${i} ${"x".repeat(900)}`,
    }));
    const text = buildTicketFromConversation(long);
    expect(text.length).toBeLessThanOrEqual(MAX_TICKET_LENGTH);
    expect(text).toContain("message 9");
    expect(text).not.toContain("message 0 ");
  });
});

describe("ticket store", () => {
  it("creates tickets with readable unique IDs and saves them to disk", async () => {
    const a = await createTicket(newTicketInput());
    const b = await createTicket(newTicketInput());
    expect(a.id).toMatch(TICKET_ID_PATTERN);
    expect(a.id).not.toBe(b.id);
    expect(a.status).toBe("open");
    expect(a.resolution).toBe("");

    const saved = JSON.parse(await readFile(path.join(dir, "tickets.json"), "utf8"));
    expect(saved).toHaveLength(2);
    expect(await getTicket(a.id.toLowerCase())).toMatchObject({ id: a.id });
  });

  it("handles many tickets created at the same time", async () => {
    await Promise.all(Array.from({ length: 10 }, () => createTicket(newTicketInput())));
    expect(await listTickets()).toHaveLength(10);
  });

  it("lists unresolved first, then by priority", async () => {
    const low = await createTicket(newTicketInput("Low"));
    const critical = await createTicket(newTicketInput("Critical"));
    const done = await createTicket(newTicketInput("Critical"));
    await updateTicket(done.id, { status: "resolved", resolution: "Fixed" });
    const ids = (await listTickets()).map((t) => t.id);
    expect(ids).toEqual([critical.id, low.id, done.id]);
  });

  it("returns undefined when updating a missing ticket", async () => {
    expect(await updateTicket("GI-ZZZZZZ", { status: "resolved" })).toBeUndefined();
  });
});

describe("POST /api/tickets (customer creates a ticket)", () => {
  it("triages the conversation, saves the ticket and returns its public status", async () => {
    analyzeTicket.mockResolvedValue({ analysis, model: "gemini-test" });
    const res = await createRoute(
      req("/api/tickets", "POST", {
        messages: conversation,
        contact: { name: "Priya", email: "priya@example.com" },
        escalation_reason: "Steps did not work twice.",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ticket.id).toMatch(TICKET_ID_PATTERN);
    expect(body.ticket).toMatchObject({ status: "open", priority: "High", category: "Technical Issue", resolution: "" });
    // The public response never includes the transcript or contact details
    expect(body.ticket.transcript).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("priya@example.com");

    const stored = await getTicket(body.ticket.id);
    expect(stored?.customer).toEqual({ name: "Priya", email: "priya@example.com" });
    expect(stored?.escalationReason).toBe("Steps did not work twice.");
    expect(stored?.transcript).toEqual(conversation);
    expect(analyzeTicket.mock.calls[0][0]).toContain("Customer: My fleet tracker stopped updating.");
  });

  it("rejects invalid contact emails", async () => {
    const res = await createRoute(req("/api/tickets", "POST", { messages: conversation, contact: { email: "nope" } }));
    expect(res.status).toBe(400);
    expect(analyzeTicket).not.toHaveBeenCalled();
  });

  it("does not create a ticket when the AI triage fails", async () => {
    analyzeTicket.mockRejectedValue(new AnalysisError("GEMINI_RATE_LIMITED", 429, "Quota reached."));
    const res = await createRoute(req("/api/tickets", "POST", { messages: conversation }));
    expect(res.status).toBe(429);
    expect(await listTickets()).toHaveLength(0);
  });
});

describe("GET /api/tickets/[id] (customer checks status)", () => {
  it("returns the status and hides the resolution until resolved", async () => {
    const t = await createTicket(newTicketInput());
    await updateTicket(t.id, { resolution: "Draft note" });

    let res = await getStatus(req(`/api/tickets/${t.id}`, "GET"), ctx(t.id.toLowerCase()));
    let body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ticket).toMatchObject({ id: t.id, status: "open", resolution: "" });
    expect(body.ticket.transcript).toBeUndefined();

    await updateTicket(t.id, { status: "resolved", resolution: "Replaced the SIM card." });
    res = await getStatus(req(`/api/tickets/${t.id}`, "GET"), ctx(t.id));
    body = await res.json();
    expect(body.ticket).toMatchObject({ status: "resolved", resolution: "Replaced the SIM card." });
  });

  it("returns 404 for unknown or malformed ticket numbers", async () => {
    expect((await getStatus(req("/api/tickets/GI-ZZZZZZ", "GET"), ctx("GI-ZZZZZZ"))).status).toBe(404);
    expect((await getStatus(req("/api/tickets/../etc", "GET"), ctx("../etc"))).status).toBe(404);
  });
});

describe("admin ticket routes", () => {
  it("rejects listing and updating without an admin session", async () => {
    const t = await createTicket(newTicketInput());
    expect((await listRoute(req("/api/tickets", "GET"))).status).toBe(401);
    expect((await patchTicket(req(`/api/tickets/${t.id}`, "PATCH", { status: "in_progress" }), ctx(t.id))).status).toBe(401);
  });

  it("lists full tickets for admins", async () => {
    await createTicket(newTicketInput());
    const res = await listRoute(req("/api/tickets", "GET", undefined, admin()));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.tickets).toHaveLength(1);
    expect(body.tickets[0].transcript).toEqual(conversation);
  });

  it("moves a ticket through in progress to resolved", async () => {
    const t = await createTicket(newTicketInput());

    let res = await patchTicket(req(`/api/tickets/${t.id}`, "PATCH", { status: "in_progress" }, admin()), ctx(t.id));
    expect((await res.json()).ticket.status).toBe("in_progress");

    res = await patchTicket(
      req(`/api/tickets/${t.id}`, "PATCH", { status: "resolved", resolution: "Reset the tracker remotely." }, admin()),
      ctx(t.id),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ticket).toMatchObject({ status: "resolved", resolution: "Reset the tracker remotely." });
  });

  it("requires a resolution note before resolving", async () => {
    const t = await createTicket(newTicketInput());
    const res = await patchTicket(req(`/api/tickets/${t.id}`, "PATCH", { status: "resolved" }, admin()), ctx(t.id));
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toMatch(/resolution note/i);
  });

  it("rejects unknown statuses and empty updates", async () => {
    const t = await createTicket(newTicketInput());
    expect((await patchTicket(req(`/api/tickets/${t.id}`, "PATCH", { status: "closed" }, admin()), ctx(t.id))).status).toBe(400);
    expect((await patchTicket(req(`/api/tickets/${t.id}`, "PATCH", {}, admin()), ctx(t.id))).status).toBe(400);
  });
});
