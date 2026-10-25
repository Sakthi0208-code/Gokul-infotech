import { isAdminRequest } from "@/lib/admin-auth";
import { errorResponse, handleRouteError, rateLimitResponse, readJsonBody } from "@/lib/api";
import { buildTicketFromConversation } from "@/lib/conversation";
import { analyzeTicket } from "@/lib/gemini";
import { createTicket, listTickets } from "@/lib/ticket-store";
import { createTicketSchema, validateRequest } from "@/lib/validation";
import { toPublicStatus } from "@/types/support-ticket";

const MAX_BODY_BYTES = 40_000;

// Customer side: the chatbot could not solve the issue, so create a ticket.
// 1. turn the chat into one ticket text, 2. AI triage, 3. save.
export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "tickets-create", 5);
  if (limited) return limited;

  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;

  const parsed = validateRequest(createTicketSchema, body.json);
  if (!parsed.ok) return errorResponse("VALIDATION_ERROR", parsed.message, 400);

  const { messages, contact, escalation_reason } = parsed.value;

  try {
    const { analysis, model } = await analyzeTicket(buildTicketFromConversation(messages));
    const ticket = await createTicket({
      customer: { name: contact?.name || "", email: contact?.email || "" },
      analysis,
      escalationReason: escalation_reason ?? "",
      transcript: messages,
      model,
    });
    return Response.json({ ticket: toPublicStatus(ticket) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "tickets-create");
  }
}

// Admin side: list all tickets (unresolved and highest priority first).
export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return errorResponse("UNAUTHORIZED", "Please sign in as an admin to view tickets.", 401);
  }
  try {
    const tickets = await listTickets();
    return Response.json({ tickets }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "tickets-list");
  }
}
