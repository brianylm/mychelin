import { NextResponse } from "next/server";

export const preferredRegion = "hnd1";

export async function GET() {
  const dbUrl = process.env.TURSO_DATABASE_URL || "";

  const checks: Record<string, string> = {
    env_turso_url: dbUrl ? `set (${dbUrl.substring(0, 40)}...)` : "MISSING",
    env_turso_token: process.env.TURSO_AUTH_TOKEN ? `set (${process.env.TURSO_AUTH_TOKEN.substring(0, 20)}...)` : "MISSING",
    env_jwt_secret: process.env.JWT_SECRET ? "set" : "MISSING (using fallback)",
  };

  // Try DB connection with 5-second timeout
  try {
    const { db } = await import("@/db");
    const { sql } = await import("drizzle-orm");
    const start = Date.now();
    const result = await Promise.race([
      db.run(sql`SELECT 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error("DB query timed out after 5s")), 5000)),
    ]);
    checks.database = `ok (${Date.now() - start}ms)`;
  } catch (error) {
    checks.database = `FAILED: ${error instanceof Error ? error.message : String(error)}`;
  }

  const allOk = checks.database?.startsWith("ok") && dbUrl.length > 0;

  return NextResponse.json(
    { status: allOk ? "healthy" : "unhealthy", checks, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  );
}
