import {
  createSessionToken,
  isAdminConfigured,
  sessionCookieHeader,
  verifyAccessCode,
} from "@/lib/admin-auth";
import { errorResponse, rateLimitResponse, readJsonBody } from "@/lib/api";
import { z } from "zod";

const bodySchema = z.object({ code: z.string().max(200) });

// Checks the admin access code typed into the chatbot.
// On success it sets an HttpOnly session cookie; the code is never stored.
export async function POST(request: Request) {
  // 5 attempts per 15 minutes per client, to stop code guessing.
  const limited = rateLimitResponse(request, "admin-login", 5, 15 * 60_000);
  if (limited) return limited;

  if (!isAdminConfigured()) {
    return errorResponse(
      "ADMIN_NOT_CONFIGURED",
      "Admin access is not set up. Add ADMIN_ACCESS_CODE to .env.local and restart the server.",
      503,
    );
  }

  const body = await readJsonBody(request, 1_000);
  if (!body.ok) return body.response;
  const parsed = bodySchema.safeParse(body.json);
  if (!parsed.success || parsed.data.code.trim().length === 0) {
    return errorResponse("VALIDATION_ERROR", "Please enter the access code.", 400);
  }

  if (!verifyAccessCode(parsed.data.code)) {
    console.warn("[admin-login] Failed attempt");
    return errorResponse("INVALID_ACCESS_CODE", "That access code is not valid.", 401);
  }

  return Response.json(
    { ok: true, redirectTo: "/admin" },
    { status: 200, headers: { "Set-Cookie": sessionCookieHeader(createSessionToken()), "Cache-Control": "no-store" } },
  );
}
