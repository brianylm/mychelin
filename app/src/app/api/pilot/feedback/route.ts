import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pilotFeedback } from "@/db/schema";
import { ensurePilotFeedbackTable } from "@/db/ensure-schema";
import { getCurrentUser } from "@/lib/auth";
import { requestPath, trackUsageEvent } from "@/lib/usage-events";

export const runtime = "edge";
export const preferredRegion = "hnd1";

const STAGES = new Set([
  "first_capture",
  "first_cook",
  "first_version",
  "pilot_general",
]);

function cleanComment(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/s+/g, " ");
  return trimmed ? trimmed.slice(0, 600) : null;
}

function cleanRating(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const rating = Number(value);
  if (!Number.isFinite(rating)) return null;
  const rounded = Math.round(rating);
  return rounded >= 1 && rounded <= 5 ? rounded : null;
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensurePilotFeedbackTable();

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const where = stage && STAGES.has(stage)
      ? and(eq(pilotFeedback.userId, currentUser.id), eq(pilotFeedback.stage, stage))
      : eq(pilotFeedback.userId, currentUser.id);

    const rows = await db
      .select({ id: pilotFeedback.id, stage: pilotFeedback.stage, rating: pilotFeedback.rating, source: pilotFeedback.source, createdAt: pilotFeedback.createdAt })
      .from(pilotFeedback)
      .where(where)
      .orderBy(desc(pilotFeedback.createdAt))
      .limit(25);

    return NextResponse.json({ feedback: rows });
  } catch (error) {
    console.error("GET /api/pilot/feedback error:", error);
    return NextResponse.json({ error: "Failed to fetch pilot feedback" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensurePilotFeedbackTable();

    const body = await request.json();
    const stage = typeof body.stage === "string" ? body.stage : "";
    if (!STAGES.has(stage)) {
      return NextResponse.json({ error: "Invalid feedback stage" }, { status: 400 });
    }

    const rating = cleanRating(body.rating);
    const comment = cleanComment(body.comment);
    const source = typeof body.source === "string" ? body.source.slice(0, 80) : null;
    if (rating === null && !comment) {
      return NextResponse.json({ error: "Rating or comment is required" }, { status: 400 });
    }

    const [row] = await db
      .insert(pilotFeedback)
      .values({
        userId: currentUser.id,
        stage,
        rating,
        comment,
        source,
        createdAt: new Date().toISOString(),
      })
      .returning({ id: pilotFeedback.id, stage: pilotFeedback.stage, rating: pilotFeedback.rating, createdAt: pilotFeedback.createdAt });

    await trackUsageEvent({
      userId: currentUser.id,
      eventName: "pilot_feedback_submitted",
      source: source ?? "pilot_feedback",
      properties: {
        stage,
        has_rating: rating !== null,
        rating: rating ?? null,
        has_comment: Boolean(comment),
      },
      path: requestPath(request),
    });

    return NextResponse.json({ feedback: row }, { status: 201 });
  } catch (error) {
    console.error("POST /api/pilot/feedback error:", error);
    return NextResponse.json({ error: "Failed to save pilot feedback" }, { status: 500 });
  }
}
