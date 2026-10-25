// Helpers shared by the API route handlers.
import type { AnalyzeErrorResponse, ApiErrorCode } from "@/types/ticket";
import { AnalysisError } from "./gemini";
import { checkRateLimit, clientKey } from "./rate-limit";

export function errorResponse(code: ApiErrorCode, message: string, status: number, headers?: HeadersInit) {
  const body: AnalyzeErrorResponse = { error: { code, message } };
  return Response.json(body, { status, headers });
}

/** Returns a 429 response if this client exceeded `limit` requests per window on `bucket`. */
export function rateLimitResponse(request: Request, bucket: string, limit: number, windowMs = 60_000): Response | null {
  const result = checkRateLimit(`${bucket}:${clientKey(request)}`, limit, windowMs);
  if (result.allowed) return null;
  return errorResponse(
    "RATE_LIMITED",
    `Too many requests. Please wait ${result.retryAfterSeconds} seconds and try again.`,
    429,
    { "Retry-After": String(result.retryAfterSeconds) },
  );
}

/** Reads the body, enforces a byte limit, and parses JSON. */
export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; json: unknown } | { ok: false; response: Response }> {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: errorResponse("INVALID_REQUEST", "The request body could not be read.", 400) };
  }
  if (new TextEncoder().encode(raw).length > maxBytes) {
    return { ok: false, response: errorResponse("PAYLOAD_TOO_LARGE", "The request is too large.", 413) };
  }
  try {
    return { ok: true, json: JSON.parse(raw) };
  } catch {
    return { ok: false, response: errorResponse("INVALID_REQUEST", "The request body must be valid JSON.", 400) };
  }
}

/** Converts any thrown error into a safe JSON error response. */
export function handleRouteError(error: unknown, route: string): Response {
  if (error instanceof AnalysisError) {
    return errorResponse(error.code, error.message, error.status);
  }
  console.error(`[${route}] Unhandled error`);
  return errorResponse("INTERNAL_ERROR", "An unexpected error occurred. Please try again.", 500);
}
