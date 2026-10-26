import { isAdminRequest } from "@/lib/admin-auth";
import { errorResponse, handleRouteError, rateLimitResponse } from "@/lib/api";
import { notifyCustomer } from "@/lib/ticket-notify";
import { TICKET_ID_PATTERN, getTicket } from "@/lib/ticket-store";

// Allow time for an AI retry on the fallback model (Vercel reads this limit).
export const maxDuration = 60;

type Context = { params: Promise<{ id: string }> };

// Admin side: send (or re-send) the resolution email for a resolved ticket.
export async function POST(request: Request, { params }: Context) {
  if (!isAdminRequest(request)) {
    return errorResponse("UNAUTHORIZED", "Please sign in as an admin to email customers.", 401);
  }
  const limited = rateLimitResponse(request, "tickets-notify", 10);
  if (limited) return limited;

  const id = (await params).id.toUpperCase();
  const ticket = TICKET_ID_PATTERN.test(id) ? await getTicket(id) : undefined;
  if (!ticket) return errorResponse("NOT_FOUND", "We couldn't find that ticket.", 404);
  if (ticket.status !== "resolved") {
    return errorResponse("VALIDATION_ERROR", "Resolve the ticket before emailing the customer.", 400);
  }

  try {
    return Response.json(await notifyCustomer(ticket), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "tickets-notify");
  }
}
