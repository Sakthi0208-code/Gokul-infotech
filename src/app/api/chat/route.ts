import { verifyAccessCode } from "@/lib/admin-auth";
import { errorResponse, handleRouteError, rateLimitResponse, readJsonBody } from "@/lib/api";
import { generateChatReply } from "@/lib/gemini";
import { chatRequestSchema, validateRequest } from "@/lib/validation";
import type { ChatSuccessResponse } from "@/types/chat";

// Allow time for an AI retry on the fallback model (Vercel reads this limit).
export const maxDuration = 60;

const MAX_BODY_BYTES = 40_000;

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "chat", 20);
  if (limited) return limited;

  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;

  const parsed = validateRequest(chatRequestSchema, body.json);
  if (!parsed.ok) return errorResponse("VALIDATION_ERROR", parsed.message, 400);

  // Never forward an admin access code to Gemini if someone pastes it as a message.
  if (parsed.value.messages.some((m) => m.role === "user" && verifyAccessCode(m.content))) {
    return errorResponse("VALIDATION_ERROR", 'For admin access, type "admin" first, then enter the code in the secure box.', 400);
  }

  try {
    const { reply, model } = await generateChatReply(parsed.value.messages);
    const result: ChatSuccessResponse = { reply, model };
    return Response.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "chat");
  }
}
