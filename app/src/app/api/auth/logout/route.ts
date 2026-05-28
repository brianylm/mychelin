import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, clearAuthCookie, getCookieDomainCandidates } from "@/lib/auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

export async function POST(request: NextRequest) {
  const host = request.headers.get("host") || undefined;
  await clearAuthCookie(host);

  const response = NextResponse.json({ message: "Logged out" });
  for (const domain of getCookieDomainCandidates(host)) {
    response.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      expires: new Date(0),
      path: "/",
      ...(domain ? { domain } : {}),
    });
  }
  return response;
}
