import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const runtime = "edge";
export const preferredRegion = "hnd1";
export const dynamic = "force-dynamic";

// Liveness + database reachability for the uptime monitor on the VPS
// (~/chief/alerts/mychelin-health.sh). Public on purpose and read-only: one
// `select 1`, no user data, no secrets, no table access.
const DB_TIMEOUT_MS = 8000;

function noStore(body: { ok: boolean; db: boolean; ms: number }, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const started = Date.now();
  try {
    await Promise.race([
      db.get(sql`select 1 as ok`),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("database timeout")), DB_TIMEOUT_MS)
      ),
    ]);
    return noStore({ ok: true, db: true, ms: Date.now() - started }, 200);
  } catch (error) {
    console.error("GET /api/health:", error instanceof Error ? error.message : String(error));
    return noStore({ ok: false, db: false, ms: Date.now() - started }, 503);
  }
}
