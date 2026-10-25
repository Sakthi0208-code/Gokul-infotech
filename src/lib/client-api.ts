// Browser-side helper for calling this app's own API routes.
import type { ApiErrorCode } from "@/types/ticket";

export type ClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; code?: ApiErrorCode; message: string };

export function postJson<T>(url: string, body: unknown): Promise<ClientResult<T>> {
  return requestJson<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export function patchJson<T>(url: string, body: unknown): Promise<ClientResult<T>> {
  return requestJson<T>(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export function getJson<T>(url: string): Promise<ClientResult<T>> {
  return requestJson<T>(url, { method: "GET", cache: "no-store" });
}

async function requestJson<T>(url: string, init: RequestInit): Promise<ClientResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    return {
      ok: false,
      message: "Could not reach the server. Check your internet connection and that the app is running.",
    };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.ok && data) return { ok: true, data: data as T };

  const error = (data as { error?: { code?: ApiErrorCode; message?: string } } | null)?.error;
  return {
    ok: false,
    code: error?.code,
    message: error?.message ?? `The server returned an unexpected response (HTTP ${res.status}). Please try again.`,
  };
}
