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

const COOKIE_NAME = "mychelin_token";
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
  return bcrypt.compare(password, hash);
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

export async function setAuthCookie(user: AuthUser): Promise<void> {
  const token = await createToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_EXPIRY_SECONDS,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
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
