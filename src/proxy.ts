import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

// Sends visitors without a valid admin session back to the homepage, where
// the chatbot opens in admin-login mode. The dashboard API checks the session
// again on every request, so this redirect is a convenience, not the only lock.
export function proxy(request: NextRequest) {
  if (isAdminRequest(request)) return NextResponse.next();
  const url = new URL("/", request.url);
  url.searchParams.set("admin", "login");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
