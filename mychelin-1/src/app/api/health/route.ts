import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const preferredRegion = "hnd1";

export async function GET() {
  const checks: Record<string, string> = {
    env_turso_url: process.env.TURSO_DATABASE_URL ? "set" : "MISSING",
    env_turso_token: process.env.TURSO_AUTH_TOKEN ? "set" : "MISSING",
    env_jwt_secret: process.env.JWT_SECRET ? "set" : "MISSING (using fallback)",
  };

  try {
    const start = Date.now();
    await db.run(sql`SELECT 1`);
    checks.database = `ok (${Date.now() - start}ms)`;
  } catch (error) {
    checks.database = `FAILED: ${error instanceof Error ? error.message : String(error)}`;
  }

  const allOk = checks.database?.startsWith("ok") && checks.env_turso_url === "set";

  return NextResponse.json(
    { status: allOk ? "healthy" : "unhealthy", checks },
    { status: allOk ? 200 : 503 }
  );
}
