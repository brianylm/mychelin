import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const preferredRegion = "hnd1";

const STATE_COOKIE = "mychelin_google_oauth_state";
const STATE_MAX_AGE_SECONDS = 10 * 60;

function baseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

function randomState(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json({ error: "Google login is not configured" }, { status: 503 });
  }

  const state = randomState();
  const returnTo = request.nextUrl.searchParams.get("returnTo");
  const safeReturnTo = returnTo && returnTo.startsWith("/shared/") ? returnTo : "/";
  const statePayload = JSON.stringify({ state, returnTo: safeReturnTo });
  const redirectUri = baseUrl(request) + "/api/auth/google/callback";
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, statePayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: STATE_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}
