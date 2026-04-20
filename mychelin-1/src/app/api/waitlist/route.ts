import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { waitlist } from "@/db/schema";
import { ensureWaitlistTable } from "@/db/ensure-schema";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// Simple RFC-5322-ish check. Good enough for signup gating; actual
// deliverability is verified when we send the first invite email.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  await ensureWaitlistTable();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const raw = (body as { email?: unknown })?.email;
  const source = (body as { source?: unknown })?.source;

  if (typeof raw !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const email = raw.toLowerCase().trim();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Please enter a valid email" }, { status: 400 });
  }

  // TODO: rate-limit with @/lib/rateLimit (RATE_LIMITS.waitlist) once
  // we decide whether to bucket by IP or email. Not MVP-blocking.

  try {
    await db
      .insert(waitlist)
      .values({
        email,
        source: typeof source === "string" ? source.slice(0, 64) : null,
      })
      .onConflictDoNothing({ target: waitlist.email });
  } catch (err) {
    console.error("waitlist insert failed:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  await ensureWaitlistTable();

  try {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(waitlist);
    const count = rows[0]?.count ?? 0;
    return NextResponse.json(
      { count },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  } catch (err) {
    console.error("waitlist count failed:", err);
    return NextResponse.json({ count: 0 });
  }
}
