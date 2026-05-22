import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { voiceRecordings, recipes } from "@/db/schema";
import { eq, max } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe } from "@/lib/recipe-access";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!(await canUserAccessRecipe(currentUser.id, Number(id)))) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const clips = await db.query.voiceRecordings.findMany({
    where: eq(voiceRecordings.recipeId, Number(id)),
    orderBy: (v, { asc }) => [asc(v.sortOrder)],
  });
  return NextResponse.json(clips);
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const recipeId = Number(id);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
    });
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const duration = Number(formData.get("duration") || 0);
    const label = formData.get("label") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(
      `recipes/${recipeId}/voice/${Date.now()}.webm`,
      file,
      { access: "public" }
    );

    const [maxOrder] = await db
      .select({ max: max(voiceRecordings.sortOrder) })
      .from(voiceRecordings)
      .where(eq(voiceRecordings.recipeId, recipeId));
    const nextOrder = (maxOrder?.max ?? -1) + 1;

    const [newClip] = await db
      .insert(voiceRecordings)
      .values({
        recipeId,
        blobUrl: blob.url,
        duration,
        label,
        sortOrder: nextOrder,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newClip, { status: 201 });
  } catch (error) {
    console.error("Voice upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload recording" },
      { status: 500 }
    );
  }
}
