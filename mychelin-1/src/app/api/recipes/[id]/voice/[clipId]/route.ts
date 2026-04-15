import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { voiceRecordings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe } from "@/lib/recipe-access";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string; clipId: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, clipId } = await context.params;

    if (!(await canUserAccessRecipe(currentUser.id, Number(id)))) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

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
