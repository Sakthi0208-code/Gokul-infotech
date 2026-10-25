// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { generateChatReply } = vi.hoisted(() => ({ generateChatReply: vi.fn() }));
vi.mock("@/lib/gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gemini")>();
  return { ...actual, generateChatReply };
});

import { POST as chatPOST } from "@/app/api/chat/route";
import { POST as loginPOST } from "@/app/api/admin/login/route";
import { POST as logoutPOST } from "@/app/api/admin/logout/route";
import {
  ADMIN_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  isAdminRequest,
  readCookie,
  verifyAccessCode,
  verifySessionToken,
} from "@/lib/admin-auth";
import { resetRateLimit } from "@/lib/rate-limit";
import { proxy } from "@/proxy";
import { NextRequest } from "next/server";

const CODE = "GI-2026-secret";

function login(code: unknown, ip = "198.51.100.1") {
  return loginPOST(
    new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ code }),
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("ADMIN_ACCESS_CODE", CODE);
  vi.stubEnv("ADMIN_SESSION_SECRET", "unit-test-secret");
  resetRateLimit();
  generateChatReply.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("access code and session tokens", () => {
  it("accepts only the exact access code (ignoring surrounding spaces)", () => {
    expect(verifyAccessCode(CODE)).toBe(true);
    expect(verifyAccessCode(`  ${CODE} `)).toBe(true);
    expect(verifyAccessCode("gi-2026-secret")).toBe(false);
    expect(verifyAccessCode("")).toBe(false);
  });

  it("rejects every code when admin access is not configured", () => {
    vi.stubEnv("ADMIN_ACCESS_CODE", "");
    expect(verifyAccessCode("")).toBe(false);
    expect(verifyAccessCode(CODE)).toBe(false);
  });

  it("creates tokens that verify until they expire", () => {
    const now = Date.UTC(2026, 9, 25, 10, 0, 0);
    const token = createSessionToken(now);
    expect(verifySessionToken(token, now)).toBe(true);
    expect(verifySessionToken(token, now + (SESSION_TTL_SECONDS - 60) * 1000)).toBe(true);
    expect(verifySessionToken(token, now + (SESSION_TTL_SECONDS + 1) * 1000)).toBe(false);
  });

  it("rejects tampered tokens and tokens signed with another secret", () => {
    const token = createSessionToken();
    const [v, exp, sig] = token.split(".");
    expect(verifySessionToken(`${v}.${Number(exp) + 99999}.${sig}`)).toBe(false);
    expect(verifySessionToken("garbage")).toBe(false);
    expect(verifySessionToken(undefined)).toBe(false);

    vi.stubEnv("ADMIN_SESSION_SECRET", "a-different-secret");
    expect(verifySessionToken(token)).toBe(false);
  });

  it("reads the session cookie from the request", () => {
    const token = createSessionToken();
    const req = new Request("http://localhost/", { headers: { cookie: `other=1; ${ADMIN_COOKIE}=${token}` } });
    expect(readCookie(req, ADMIN_COOKIE)).toBe(token);
    expect(isAdminRequest(req)).toBe(true);
    expect(isAdminRequest(new Request("http://localhost/"))).toBe(false);
  });
});

describe("POST /api/admin/login", () => {
  it("sets an HttpOnly session cookie for the correct code", async () => {
    const res = await login(CODE);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, redirectTo: "/admin" });

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${ADMIN_COOKIE}=v1.`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).not.toContain("Max-Age");
    expect(cookie).not.toContain(CODE);
  });

  it("rejects a wrong code with 401 and no cookie", async () => {
    const res = await login("wrong-code");
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("INVALID_ACCESS_CODE");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("rejects an empty code", async () => {
    expect((await login("   ")).status).toBe(400);
  });

  it("returns 503 when admin access is not configured", async () => {
    vi.stubEnv("ADMIN_ACCESS_CODE", "");
    const res = await login(CODE);
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("ADMIN_NOT_CONFIGURED");
  });

  it("locks out after 5 attempts from the same client", async () => {
    for (let i = 0; i < 5; i++) await login("guess-" + i, "203.0.113.9");
    const res = await login(CODE, "203.0.113.9");
    expect(res.status).toBe(429);
    // A different client is not affected
    expect((await login(CODE, "203.0.113.10")).status).toBe(200);
  });
});

describe("POST /api/admin/logout", () => {
  it("clears the session cookie", async () => {
    const res = await logoutPOST();
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

describe("proxy for /admin", () => {
  it("redirects visitors without a session to the homepage login", () => {
    const res = proxy(new NextRequest("http://localhost/admin"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/?admin=login");
  });

  it("lets signed-in admins through", () => {
    const req = new NextRequest("http://localhost/admin", {
      headers: { cookie: `${ADMIN_COOKIE}=${createSessionToken()}` },
    });
    const res = proxy(req);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("chat never forwards the admin code to Gemini", () => {
  it("rejects a chat message that is the access code", async () => {
    const res = await chatPOST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: CODE }] }),
      }),
    );
    expect(res.status).toBe(400);
    expect(generateChatReply).not.toHaveBeenCalled();
  });
});
