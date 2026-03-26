import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { recipePhotos, recipes } from "@/db/schema";
import { eq, max } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const photos = await db.query.recipePhotos.findMany({
    where: eq(recipePhotos.recipeId, Number(id)),
    orderBy: (p, { asc }) => [asc(p.sortOrder)],
  });
  return NextResponse.json(photos);
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const recipeId = Number(id);

    // Verify recipe exists
    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
    });
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(`recipes/${recipeId}/photos/${Date.now()}-${file.name}`, file, {
      access: "public",
    });

    // Get next sort order
    const [maxOrder] = await db
      .select({ max: max(recipePhotos.sortOrder) })
      .from(recipePhotos)
      .where(eq(recipePhotos.recipeId, recipeId));
    const nextOrder = (maxOrder?.max ?? -1) + 1;

    const [newPhoto] = await db
      .insert(recipePhotos)
      .values({
        recipeId,
        blobUrl: blob.url,
        sortOrder: nextOrder,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newPhoto, { status: 201 });
  } catch (error) {
    console.error("Photo upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}
