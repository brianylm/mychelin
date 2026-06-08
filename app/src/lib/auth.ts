import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Lazily resolve JWT_SECRET so a missing env var doesn't crash at module
// import time (mirrors the db client lazy-init pattern). The check fires
// on first token sign/verify instead, so importing this module is safe.
// NOTE: no dev fallback — if you hit this in dev, add JWT_SECRET to
// .env.local. Silently falling back to a known secret in production would
// let anyone forge tokens.
let _jwtSecret: Uint8Array | null = null;
function getJwtSecret(): Uint8Array {
  if (_jwtSecret) return _jwtSecret;
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  _jwtSecret = new TextEncoder().encode(secret);
  return _jwtSecret;
}

export const COOKIE_NAME = "mychelin_token";
const TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({ id: user.id, name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_EXPIRY_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      id: payload.id as number,
      name: payload.name as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

function getCookieDomain(host: string): string | undefined {
  if (!host || host.includes("localhost") || host.includes("127.0.0.1")) {
    return undefined;
  }

  // Allow explicit override via env var.
  if (process.env.COOKIE_DOMAIN) {
    return process.env.COOKIE_DOMAIN;
  }

  const hostname = host.split(":")[0];

  // Vercel preview/production domains should use host-only cookies. A broad
  // Domain attribute like `.sg.vercel.app` is fragile and can survive logout in
  // confusing ways across aliases. Host-only is safer for auth.
  if (hostname.endsWith(".vercel.app")) {
    return undefined;
  }

  // For custom domains, use the root domain (last two parts).
  const parts = hostname.split(".");
  if (parts.length > 2) {
    return `.${parts.slice(-2).join(".")}`;
  }

  return `.${hostname}`;
}

export function getCookieDomainCandidates(host?: string): (string | undefined)[] {
  const domainCandidates = new Set<string>();
  if (!host) return [undefined];

  const hostname = host.split(":")[0];
  const configured = getCookieDomain(host);
  if (configured) domainCandidates.add(configured);

  // Clear legacy/broad cookies from earlier deployments too. Browsers ignore
  // invalid domains, but these make logout resilient if the domain strategy
  // changed after a user logged in.
  if (hostname && !hostname.includes("localhost") && !hostname.includes("127.0.0.1")) {
    domainCandidates.add(hostname);
    domainCandidates.add(`.${hostname}`);

    const parts = hostname.split(".");
    if (hostname.endsWith(".vercel.app") && parts.length >= 3) {
      domainCandidates.add(`.${parts.slice(-3).join(".")}`);
    }
    if (!hostname.endsWith(".vercel.app") && parts.length > 2) {
      domainCandidates.add(`.${parts.slice(-2).join(".")}`);
    }
  }

  // Put the host-only cookie last. Some runtimes collapse duplicate
  // Set-Cookie headers by name despite differing Domain attributes; if only
  // one survives, it must clear the current host-only auth cookie.
  return [...domainCandidates, undefined];
}

export function buildClearAuthCookieHeaders(host?: string): string[] {
  return getCookieDomainCandidates(host).map((domain) => {
    const parts = [
      `${COOKIE_NAME}=`,
      "Path=/",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      "Max-Age=0",
      "HttpOnly",
      "SameSite=Lax",
    ];
    if (process.env.NODE_ENV === "production") parts.push("Secure");
    if (domain) parts.push(`Domain=${domain}`);
    return parts.join("; ");
  });
}

export async function setAuthCookie(
  user: AuthUser,
  host?: string
): Promise<void> {
  const token = await createToken(user);
  const cookieStore = await cookies();
  const domain = host ? getCookieDomain(host) : undefined;
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_EXPIRY_SECONDS,
    path: "/",
    ...(domain ? { domain } : {}),
  });
}

export async function clearAuthCookie(host?: string): Promise<void> {
  const cookieStore = await cookies();

  for (const domain of getCookieDomainCandidates(host)) {
    cookieStore.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      expires: new Date(0),
      path: "/",
      ...(domain ? { domain } : {}),
    });
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getUserFromDb(
  email: string
): Promise<(typeof users.$inferSelect) | undefined> {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}
