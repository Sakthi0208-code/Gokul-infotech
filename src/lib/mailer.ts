// Sends the "your ticket is resolved" email to the customer over SMTP
// (for example Gmail with an app password). Server-only.
import nodemailer from "nodemailer";
import type { SupportTicket } from "@/types/support-ticket";

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  replyTo?: string;
}

export function getMailConfig(): MailConfig | undefined {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, ""); // Gmail shows app passwords with spaces
  if (!host || !user || !pass) return undefined;
  const port = Number(process.env.SMTP_PORT?.trim() || 465);
  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    from: process.env.MAIL_FROM?.trim() || `Gokul Infocare Support (demo) <${user}>`,
    replyTo: process.env.MAIL_REPLY_TO?.trim() || undefined,
  };
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Builds the email. Pure function, so it is easy to test and preview. */
export function buildResolutionEmail(ticket: SupportTicket): { subject: string; text: string; html: string } {
  const name = ticket.customer.name?.trim() || "there";
  const subject = `Resolved: your support ticket ${ticket.id}`;

  const text = [
    `Hi ${name},`,
    "",
    `Good news: your support ticket ${ticket.id} has been resolved.`,
    "",
    "Your issue:",
    ticket.analysis.summary,
    "",
    "Resolution from our support team:",
    ticket.resolution,
    "",
    `If the problem comes back, reply to this email or open the chat on our website and type "status ${ticket.id}".`,
    "",
    "Gokul Infocare Support",
    "",
    "--",
    "Sent by a concept demo built for a job assessment. This is not an official Gokul Infocare email.",
  ].join("\n");

  const paragraph = (s: string) => escapeHtml(s).replace(/\n/g, "<br>");
  const html = `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:linear-gradient(90deg,#059669,#0d9488);padding:22px 28px;color:#ffffff">
          <div style="font-size:13px;opacity:.9">Gokul Infocare Support</div>
          <div style="font-size:20px;font-weight:700;margin-top:4px">Your ticket has been resolved ✅</div>
        </td></tr>
        <tr><td style="padding:24px 28px;font-size:15px;line-height:1.6">
          <p style="margin:0 0 14px">Hi ${escapeHtml(name)},</p>
          <p style="margin:0 0 18px">Good news: your support ticket <strong style="font-family:Consolas,monospace">${escapeHtml(ticket.id)}</strong> has been resolved.</p>
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b">Your issue</div>
          <p style="margin:6px 0 18px">${paragraph(ticket.analysis.summary)}</p>
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b">Resolution from our support team</div>
          <div style="margin:6px 0 20px;padding:14px 16px;background:#ecfdf5;border-left:4px solid #059669;border-radius:8px">${paragraph(ticket.resolution)}</div>
          <p style="margin:0;color:#475569;font-size:14px">If the problem comes back, reply to this email or open the chat on our website and type <strong>status ${escapeHtml(ticket.id)}</strong>.</p>
        </td></tr>
        <tr><td style="padding:14px 28px;background:#f8fafc;color:#94a3b8;font-size:12px">
          Sent by a concept demo built for a job assessment. This is not an official Gokul Infocare email.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, text, html };
}

export type EmailResult =
  | { sent: true; to: string; message: string }
  | { sent: false; reason: "NOT_CONFIGURED" | "NO_EMAIL" | "FAILED"; message: string };

/** Emails the customer. Never throws: the result says what happened. */
export async function sendResolutionEmail(ticket: SupportTicket): Promise<EmailResult> {
  const to = ticket.customer.email?.trim();
  if (!to) {
    return {
      sent: false,
      reason: "NO_EMAIL",
      message: `The customer didn't leave an email address. They can see the resolution by typing "status ${ticket.id}" in the chat.`,
    };
  }
  const config = getMailConfig();
  if (!config) {
    return {
      sent: false,
      reason: "NOT_CONFIGURED",
      message: "Email is not set up. Add SMTP_HOST, SMTP_USER and SMTP_PASS to .env.local and restart the server.",
    };
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  const email = buildResolutionEmail(ticket);
  try {
    await transport.sendMail({ from: config.from, to, replyTo: config.replyTo, ...email });
    return { sent: true, to, message: `Resolution email sent to ${to}.` };
  } catch (error) {
    // Log only the error code, never credentials or the email body.
    const code = (error as { code?: string; responseCode?: number }).code ?? "unknown";
    const responseCode = (error as { responseCode?: number }).responseCode;
    console.error(`[mailer] Send failed: ${code}${responseCode ? ` (${responseCode})` : ""}`);
    const authProblem = code === "EAUTH" || responseCode === 535;
    return {
      sent: false,
      reason: "FAILED",
      message: authProblem
        ? "The email server rejected the login. Check SMTP_USER and SMTP_PASS (for Gmail, use an app password)."
        : "The email could not be sent. Check the SMTP settings and your internet connection, then try again.",
    };
  }
}
