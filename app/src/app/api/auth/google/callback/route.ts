import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureUserOAuthColumns } from "@/db/ensure-schema";
import { hashPassword, setAuthCookie, type AuthUser } from "@/lib/auth";
import { trackUsageEvent } from "@/lib/usage-events";

export const runtime = "edge";
export const preferredRegion = "hnd1";

const STATE_COOKIE = "mychelin_google_oauth_state";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

type GoogleTokenResponse = {
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleProfile = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  iss?: string;
};

function baseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

function errorRedirect(request: NextRequest, reason: string): NextResponse {
  const url = new URL("/login", baseUrl(request));
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

function parseStateCookie(value: string | undefined): { state: string; returnTo: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { state?: unknown; returnTo?: unknown };
    if (typeof parsed.state !== "string") return null;
    return {
      state: parsed.state,
      returnTo: typeof parsed.returnTo === "string" && parsed.returnTo.startsWith("/shared/") ? parsed.returnTo : "/",
    };
  } catch {
    return null;
  }
}

async function exchangeCodeForIdToken(input: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const body = (await response.json().catch(() => ({}))) as GoogleTokenResponse;
  if (!response.ok || !body.id_token) {
    throw new Error(body.error_description || body.error || "Google token exchange failed");
  }
  return body.id_token;
}

async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleProfile> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    audience: clientId,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("Google profile is missing required fields");
  }
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    email_verified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
    iss: typeof payload.iss === "string" ? payload.iss : undefined,
  };
}

async function findOrCreateGoogleUser(profile: GoogleProfile): Promise<AuthUser> {
  await ensureUserOAuthColumns();
  const now = new Date().toISOString();

  const byGoogleSub = await db.query.users.findFirst({
    where: eq(users.googleSub, profile.sub),
  });
  if (byGoogleSub) {
    return { id: byGoogleSub.id, name: byGoogleSub.name, email: byGoogleSub.email };
  }

  const byEmail = await db.query.users.findFirst({
    where: eq(users.email, profile.email),
  });
  if (byEmail) {
    if (profile.email_verified) {
      await db
        .update(users)
        .set({
          googleSub: profile.sub,
          authProvider: byEmail.authProvider === "password" ? "password_google" : byEmail.authProvider,
          emailVerified: true,
          avatarUrl: byEmail.avatarUrl ?? profile.picture ?? null,
        })
        .where(eq(users.id, byEmail.id));
    }
    return { id: byEmail.id, name: byEmail.name, email: byEmail.email };
  }

  const passwordHash = await hashPassword(crypto.randomUUID());
  const [created] = await db
    .insert(users)
    .values({
      name: profile.name || profile.email.split("@")[0] || "Mychelin cook",
      email: profile.email,
      passwordHash,
      avatarUrl: profile.picture ?? null,
      authProvider: "google",
      googleSub: profile.sub,
      emailVerified: Boolean(profile.email_verified),
      createdAt: now,
    })
    .returning();

  await trackUsageEvent({
    userId: created.id,
    eventName: "user_signed_up",
    source: "google_auth",
    properties: { provider: "google" },
    path: "/api/auth/google/callback",
  });

  return { id: created.id, name: created.name, email: created.email };
}

export async function GET(request: NextRequest) {
  const responseState = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const stateCookie = parseStateCookie(request.cookies.get(STATE_COOKIE)?.value);

  if (error) return errorRedirect(request, "google_cancelled");
  if (!clientId || !clientSecret) return errorRedirect(request, "google_not_configured");
  if (!code || !responseState || !stateCookie || responseState !== stateCookie.state) {
    return errorRedirect(request, "google_state_mismatch");
  }

  try {
    const redirectUri = baseUrl(request) + "/api/auth/google/callback";
    const idToken = await exchangeCodeForIdToken({ code, clientId, clientSecret, redirectUri });
    const profile = await verifyGoogleIdToken(idToken, clientId);
    const authUser = await findOrCreateGoogleUser(profile);
    const host = request.headers.get("host") || undefined;
    await setAuthCookie(authUser, host);

    const destination = new URL(stateCookie.returnTo || "/", baseUrl(request));
    const response = NextResponse.redirect(destination);
    response.cookies.set(STATE_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return errorRedirect(request, "google_login_failed");
  }
}
