import { NextRequest, NextResponse } from "next/server";
import { buildClearAuthCookieHeaders, clearAuthCookie } from "@/lib/auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function POST(request: NextRequest) {
  const host = request.headers.get("host") || undefined;
  await clearAuthCookie(host);

  const response = NextResponse.json(
    { message: "Logged out" },
    { headers: { "Cache-Control": "no-store" } }
  );

  // NextResponse.cookies.set() collapses same-name cookies, even when the
  // Domain differs. Append raw Set-Cookie headers so every possible legacy
  // auth cookie variant is actually expired in the browser.
  for (const cookie of buildClearAuthCookieHeaders(host)) {
    response.headers.append("Set-Cookie", cookie);
  }

  return response;
}
