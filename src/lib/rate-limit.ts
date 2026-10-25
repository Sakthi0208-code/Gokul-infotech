// Small in-memory rate limiter (fixed window, per client IP and route).
// It protects the free Gemini quota from accidental rapid clicking or abuse
// on a single server. On serverless hosts like Vercel each instance has its
// own memory, so this is best-effort, not a guarantee.

const WINDOW_MS = 60_000;
export const MAX_REQUESTS_PER_WINDOW = 10;

const hits = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(
  key: string,
  limit = MAX_REQUESTS_PER_WINDOW,
  windowMs = WINDOW_MS,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const entry = hits.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    hits.set(key, { count: 1, windowStart: now });
    pruneOldEntries(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.windowStart + windowMs - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimit() {
  hits.clear();
}

/** Best-effort client identifier from proxy headers. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

function pruneOldEntries(now: number) {
  if (hits.size < 1000) return;
  for (const [key, entry] of hits) {
    // Longest window in use is 15 minutes (admin login).
    if (now - entry.windowStart >= 15 * WINDOW_MS) hits.delete(key);
  }
}
