import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { voiceRecordings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string; clipId: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id, clipId } = await context.params;

    const [deleted] = await db
      .delete(voiceRecordings)
      .where(
        and(
          eq(voiceRecordings.id, Number(clipId)),
          eq(voiceRecordings.recipeId, Number(id))
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    try {
      await del(deleted.blobUrl);
    } catch {
      // Best-effort
    }

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete voice error:", error);
    return NextResponse.json(
      { error: "Failed to delete recording" },
      { status: 500 }
    );
  }
}
