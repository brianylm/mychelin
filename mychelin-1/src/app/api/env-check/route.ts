import { NextResponse } from "next/server";

export const preferredRegion = "hnd1";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL || "MISSING",
      TURSO_AUTH_TOKEN_length: process.env.TURSO_AUTH_TOKEN?.length || 0,
      TURSO_AUTH_TOKEN_prefix: process.env.TURSO_AUTH_TOKEN?.substring(0, 30) || "MISSING",
      JWT_SECRET_set: !!process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_REGION: process.env.VERCEL_REGION,
    },
  });
}
