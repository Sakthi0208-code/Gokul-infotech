import { isAdminRequest } from "@/lib/admin-auth";
import { errorResponse, handleRouteError, rateLimitResponse, readJsonBody } from "@/lib/api";
import { notifyCustomer } from "@/lib/ticket-notify";
import { TICKET_ID_PATTERN, getTicket, updateTicket } from "@/lib/ticket-store";
import { updateTicketSchema, validateRequest } from "@/lib/validation";
import { toPublicStatus } from "@/types/support-ticket";

type Context = { params: Promise<{ id: string }> };

const notFound = () => errorResponse("NOT_FOUND", "We couldn't find a ticket with that number. Please check it and try again.", 404);

// Customer side: check a ticket's status by its number (e.g. GI-7K3M9Q).
// Returns only status-level details, never the transcript.
export async function GET(request: Request, { params }: Context) {
  const limited = rateLimitResponse(request, "tickets-status", 30);
  if (limited) return limited;

  const id = (await params).id.toUpperCase();
  if (!TICKET_ID_PATTERN.test(id)) return notFound();

  try {
    const ticket = await getTicket(id);
    if (!ticket) return notFound();
    return Response.json({ ticket: toPublicStatus(ticket) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "tickets-status");
  }
}

// Admin side: change status and/or write the resolution note.
// When a ticket becomes resolved, the customer is emailed the note (if they
// left an email address and SMTP is configured). Email problems never undo
// the status change; the result is returned and saved on the ticket.
export async function PATCH(request: Request, { params }: Context) {
  if (!isAdminRequest(request)) {
    return errorResponse("UNAUTHORIZED", "Please sign in as an admin to update tickets.", 401);
  }

  const id = (await params).id.toUpperCase();
  if (!TICKET_ID_PATTERN.test(id)) return notFound();

  const body = await readJsonBody(request, 10_000);
  if (!body.ok) return body.response;

  const parsed = validateRequest(updateTicketSchema, body.json);
  if (!parsed.ok) return errorResponse("VALIDATION_ERROR", parsed.message, 400);

  try {
    const before = await getTicket(id);
    if (!before) return notFound();
    const ticket = await updateTicket(id, parsed.value);
    if (!ticket) return notFound();

    if (ticket.status === "resolved" && before.status !== "resolved") {
      const result = await notifyCustomer(ticket);
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ ticket }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "tickets-update");
  }
}
