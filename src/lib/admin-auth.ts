// Admin access for the assistance dashboard.
// 1. The admin types "admin" in the chatbot and enters ADMIN_ACCESS_CODE.
// 2. The server checks the code and sets a signed, HttpOnly session cookie.
// 3. The proxy (src/proxy.ts) and the dashboard API check that cookie.
// The code itself never reaches the browser bundle or Gemini.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "gi_admin_session";
export const SESSION_TTL_SECONDS = 4 * 60 * 60; // 4 hours

function getAccessCode(): string | undefined {
  return process.env.ADMIN_ACCESS_CODE?.trim() || undefined;
}

export function isAdminConfigured(): boolean {
  return Boolean(getAccessCode());
}

// Key used to sign session cookies. A dedicated ADMIN_SESSION_SECRET is best.
// Without it, the key is derived from the access code plus the Gemini key, so
// changing the access code logs every admin out.
function signingKey(): string | undefined {
  const code = getAccessCode();
  if (!code) return undefined;
  return process.env.ADMIN_SESSION_SECRET?.trim() || `${code}:${process.env.GEMINI_API_KEY ?? ""}`;
}

// Compares hashes so the check takes the same time whatever the input.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function verifyAccessCode(input: string): boolean {
  const code = getAccessCode();
  if (!code) return false;
  return safeEqual(input.trim(), code);
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** Token format: v1.<expiry unix seconds>.<signature> */
export function createSessionToken(now = Date.now()): string {
  const key = signingKey();
  if (!key) throw new Error("Admin access is not configured");
  const payload = `v1.${Math.floor(now / 1000) + SESSION_TTL_SECONDS}`;
  return `${payload}.${sign(payload, key)}`;
}

export function verifySessionToken(token: string | undefined | null, now = Date.now()): boolean {
  const key = signingKey();
  if (!key || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const payload = `${parts[0]}.${parts[1]}`;
  if (!safeEqual(parts[2], sign(payload, key))) return false;
  const expiry = Number(parts[1]);
  return Number.isFinite(expiry) && expiry * 1000 > now;
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function isAdminRequest(request: Request): boolean {
  return verifySessionToken(readCookie(request, ADMIN_COOKIE));
}

const secureFlag = () => (process.env.NODE_ENV === "production" ? "; Secure" : "");

// No Max-Age: a browser-session cookie, removed when the browser is closed.
// The token inside also expires after SESSION_TTL_SECONDS.
export function sessionCookieHeader(token: string): string {
  return `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict${secureFlag()}`;
}

export function clearSessionCookieHeader(): string {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureFlag()}`;
}
