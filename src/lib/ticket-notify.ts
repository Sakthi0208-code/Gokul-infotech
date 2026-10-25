import type { SupportTicket } from "@/types/support-ticket";
import { sendResolutionEmail, type EmailResult } from "./mailer";
import { updateTicket } from "./ticket-store";

/** Emails the customer about a resolved ticket and records the result on the ticket. */
export async function notifyCustomer(ticket: SupportTicket): Promise<{ ticket: SupportTicket; email: EmailResult }> {
  const email = await sendResolutionEmail(ticket);
  const updated = await updateTicket(ticket.id, {
    notification: {
      status: email.sent ? "sent" : email.reason === "FAILED" ? "failed" : "skipped",
      at: new Date().toISOString(),
      to: ticket.customer.email ?? "",
      message: email.message,
    },
  });
  return { ticket: updated ?? ticket, email };
}
