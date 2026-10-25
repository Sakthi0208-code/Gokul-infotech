// @vitest-environment node
// Tests for the resolution email. nodemailer is mocked, so no email is sent.
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn();
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) };
});
vi.mock("nodemailer", () => ({ default: { createTransport }, createTransport }));

import { POST as notifyRoute } from "@/app/api/tickets/[id]/notify/route";
import { PATCH as patchTicket } from "@/app/api/tickets/[id]/route";
import { ADMIN_COOKIE, createSessionToken } from "@/lib/admin-auth";
import { buildResolutionEmail, getMailConfig, sendResolutionEmail } from "@/lib/mailer";
import { resetRateLimit } from "@/lib/rate-limit";
import { createTicket, getTicket } from "@/lib/ticket-store";
import type { SupportTicket } from "@/types/support-ticket";

const ticket: SupportTicket = {
  id: "GI-7K3M9Q",
  createdAt: "2026-10-25T08:00:00.000Z",
  updatedAt: "2026-10-25T09:00:00.000Z",
  status: "resolved",
  customer: { name: "Priya <script>", email: "priya@example.com" },
  analysis: {
    category: "Technical Issue",
    priority: "High",
    sentiment: "Negative",
    summary: "Fleet tracker stopped reporting location.",
    suggested_reply: "Sorry about that.",
    recommended_action: "Check SIM.",
    priority_reason: "Blocked.",
  },
  escalationReason: "",
  transcript: [{ role: "user", content: "Tracker offline" }],
  resolution: "We replaced the SIM card.\nPlease restart the tracker.",
  model: "test",
};

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "gi-mail-"));
  vi.stubEnv("TICKETS_FILE", path.join(dir, "tickets.json"));
  vi.stubEnv("SMTP_HOST", "smtp.example.com");
  vi.stubEnv("SMTP_USER", "support@example.com");
  vi.stubEnv("SMTP_PASS", "abcd efgh ijkl mnop");
  vi.stubEnv("SMTP_PORT", "");
  vi.stubEnv("MAIL_FROM", "");
  vi.stubEnv("ADMIN_ACCESS_CODE", "code");
  vi.stubEnv("ADMIN_SESSION_SECRET", "secret");
  sendMail.mockReset();
  createTransport.mockClear();
  resetRateLimit();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe("mail config", () => {
  it("reads SMTP settings and strips spaces from Gmail app passwords", () => {
    expect(getMailConfig()).toMatchObject({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      pass: "abcdefghijklmnop",
      from: "Gokul Infocare Support (demo) <support@example.com>",
    });
  });

  it("is undefined when settings are missing", () => {
    vi.stubEnv("SMTP_PASS", "");
    expect(getMailConfig()).toBeUndefined();
  });
});

describe("buildResolutionEmail", () => {
  it("includes the ticket number, issue and the admin's note", () => {
    const email = buildResolutionEmail(ticket);
    expect(email.subject).toBe("Resolved: your support ticket GI-7K3M9Q");
    expect(email.text).toContain("We replaced the SIM card.");
    expect(email.text).toContain("Fleet tracker stopped reporting location.");
    expect(email.text).toContain('type "status GI-7K3M9Q"');
    expect(email.html).toContain("We replaced the SIM card.<br>Please restart the tracker.");
  });

  it("escapes HTML from customer-provided text", () => {
    const email = buildResolutionEmail(ticket);
    expect(email.html).toContain("Priya &lt;script&gt;");
    expect(email.html).not.toContain("<script>");
  });
});

describe("sendResolutionEmail", () => {
  it("sends the email to the customer", async () => {
    sendMail.mockResolvedValue({ messageId: "1" });
    const result = await sendResolutionEmail(ticket);
    expect(result).toEqual({ sent: true, to: "priya@example.com", message: "Resolution email sent to priya@example.com." });
    expect(sendMail.mock.calls[0][0]).toMatchObject({ to: "priya@example.com", subject: "Resolved: your support ticket GI-7K3M9Q" });
  });

  it("skips customers without an email address", async () => {
    const result = await sendResolutionEmail({ ...ticket, customer: { name: "Anon", email: "" } });
    expect(result).toMatchObject({ sent: false, reason: "NO_EMAIL" });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("explains when SMTP is not configured", async () => {
    vi.stubEnv("SMTP_HOST", "");
    const result = await sendResolutionEmail(ticket);
    expect(result).toMatchObject({ sent: false, reason: "NOT_CONFIGURED" });
  });

  it("reports login failures without leaking the password", async () => {
    sendMail.mockRejectedValue(Object.assign(new Error("Invalid login abcdefghijklmnop"), { code: "EAUTH", responseCode: 535 }));
    const result = await sendResolutionEmail(ticket);
    expect(result).toMatchObject({ sent: false, reason: "FAILED" });
    expect(result.message).toMatch(/app password/);
    expect(result.message).not.toContain("abcdefghijklmnop");
  });
});

describe("resolving a ticket emails the customer", () => {
  const admin = () => ({ cookie: `${ADMIN_COOKIE}=${createSessionToken()}` });
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const patch = (id: string, body: unknown, headers: Record<string, string> = admin()) =>
    patchTicket(
      new Request(`http://localhost/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      }),
      ctx(id),
    );

  async function newOpenTicket(email = "priya@example.com") {
    return createTicket({
      customer: { name: "Priya", email },
      analysis: ticket.analysis,
      escalationReason: "",
      transcript: ticket.transcript,
      model: "test",
    });
  }

  it("sends the email once when the ticket becomes resolved and records it", async () => {
    sendMail.mockResolvedValue({ messageId: "1" });
    const t = await newOpenTicket();

    const res = await patch(t.id, { status: "resolved", resolution: "Replaced the SIM." });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.email).toMatchObject({ sent: true });
    expect(body.ticket.notification).toMatchObject({ status: "sent", to: "priya@example.com" });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].text).toContain("Replaced the SIM.");

    // Saving the note again on a resolved ticket does not re-send
    await patch(t.id, { resolution: "Replaced the SIM card." });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("still resolves the ticket when email fails, and records the failure", async () => {
    sendMail.mockRejectedValue(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }));
    const t = await newOpenTicket();
    const res = await patch(t.id, { status: "resolved", resolution: "Fixed." });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ticket.status).toBe("resolved");
    expect(body.email.sent).toBe(false);
    expect((await getTicket(t.id))?.notification?.status).toBe("failed");
  });

  it("lets an admin re-send the email for a resolved ticket", async () => {
    sendMail.mockRejectedValueOnce(Object.assign(new Error("x"), { code: "ECONNECTION" })).mockResolvedValueOnce({});
    const t = await newOpenTicket();
    await patch(t.id, { status: "resolved", resolution: "Fixed." });

    const res = await notifyRoute(
      new Request(`http://localhost/api/tickets/${t.id}/notify`, { method: "POST", headers: admin() }),
      ctx(t.id),
    );
    expect((await res.json()).email.sent).toBe(true);
    expect((await getTicket(t.id))?.notification?.status).toBe("sent");
  });

  it("blocks re-sending without an admin session or before resolving", async () => {
    const t = await newOpenTicket();
    const anon = await notifyRoute(new Request(`http://localhost/api/tickets/${t.id}/notify`, { method: "POST" }), ctx(t.id));
    expect(anon.status).toBe(401);
    const early = await notifyRoute(
      new Request(`http://localhost/api/tickets/${t.id}/notify`, { method: "POST", headers: admin() }),
      ctx(t.id),
    );
    expect(early.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });
});
