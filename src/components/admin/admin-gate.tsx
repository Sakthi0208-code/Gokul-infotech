import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-auth";

/**
 * Server-side lock for admin pages. Renders its children only for a valid,
 * signed admin session; everyone else is sent to the homepage chat login.
 * This runs on every request, in addition to the redirect in src/proxy.ts.
 */
export async function AdminGate({ children }: { children: React.ReactNode }) {
  // Tell Next.js this must run per request: checking the session expiry reads
  // the current time, which must never be frozen into a prerendered page.
  await connection();
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    redirect("/?admin=login");
  }
  return <>{children}</>;
}
