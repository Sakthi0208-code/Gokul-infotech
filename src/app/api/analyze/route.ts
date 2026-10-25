import { isAdminRequest } from "@/lib/admin-auth";
import { errorResponse, handleRouteError, rateLimitResponse, readJsonBody } from "@/lib/api";
import { analyzeTicket } from "@/lib/gemini";
import { analyzeRequestSchema, validateTicketText } from "@/lib/validation";
import type { AnalyzeSuccessResponse } from "@/types/ticket";

// Hard cap on the raw request body (bytes) before we even parse JSON.
const MAX_BODY_BYTES = 20_000;

export async function POST(request: Request) {
  // 0. Only signed-in admins may use the dashboard API
  if (!isAdminRequest(request)) {
    return errorResponse(
      "UNAUTHORIZED",
      'Your admin session has expired. Open the chat assistant, type "admin" and enter your access code.',
      401,
    );
  }

  // 1. Rate limit
  const limited = rateLimitResponse(request, "analyze", 10);
  if (limited) return limited;

  // 2. Read, size-check and parse the body
  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;

  // 3. Check its shape
  const shape = analyzeRequestSchema.safeParse(body.json);
  if (!shape.success) {
    return errorResponse("INVALID_REQUEST", 'The request body must include a "ticket" string.', 400);
  }

  // 4. Validate the ticket text itself
  const ticket = validateTicketText(shape.data.ticket);
  if (!ticket.ok) {
    return errorResponse("VALIDATION_ERROR", ticket.message, 400);
  }

  // 5. Call Gemini
  try {
    const { analysis, model } = await analyzeTicket(ticket.value);
    const result: AnalyzeSuccessResponse = { analysis, model };
    return Response.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "analyze");
  }
}
