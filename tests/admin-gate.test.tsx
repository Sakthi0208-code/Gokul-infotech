// @vitest-environment node
// The /admin page checks the signed session on the server before rendering.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieValue, redirect } = vi.hoisted(() => ({
  cookieValue: { current: undefined as string | undefined },
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (cookieValue.current ? { value: cookieValue.current } : undefined) }),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

import { AdminGate } from "@/components/admin/admin-gate";
import { createSessionToken } from "@/lib/admin-auth";

beforeEach(() => {
  vi.stubEnv("ADMIN_ACCESS_CODE", "code");
  vi.stubEnv("ADMIN_SESSION_SECRET", "secret");
  cookieValue.current = undefined;
  redirect.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AdminGate", () => {
  it("redirects visitors without a session to the chatbot login", async () => {
    await expect(AdminGate({ children: "secret dashboard" })).rejects.toThrow("REDIRECT:/?admin=login");
  });

  it("redirects forged or expired sessions", async () => {
    cookieValue.current = "v1.9999999999.forged";
    await expect(AdminGate({ children: "x" })).rejects.toThrow("REDIRECT:/?admin=login");

    cookieValue.current = createSessionToken(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago, past the 4-hour limit
    await expect(AdminGate({ children: "x" })).rejects.toThrow("REDIRECT:/?admin=login");
  });

  it("redirects everyone when admin access is not configured", async () => {
    cookieValue.current = createSessionToken();
    vi.stubEnv("ADMIN_ACCESS_CODE", "");
    await expect(AdminGate({ children: "x" })).rejects.toThrow("REDIRECT:/?admin=login");
  });

  it("renders the dashboard for a valid session", async () => {
    cookieValue.current = createSessionToken();
    const result = await AdminGate({ children: "secret dashboard" });
    expect(redirect).not.toHaveBeenCalled();
    expect(result.props.children).toBe("secret dashboard");
  });
});
