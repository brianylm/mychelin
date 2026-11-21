import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { validateUpload } from "@/lib/upload-validation";
import { db } from "@/db";
import { recipePhotos, recipes } from "@/db/schema";
import { and, eq, max } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe, canUserEditRecipe } from "@/lib/recipe-access";
import { requestPath, trackUsageEvent } from "@/lib/usage-events";

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

  const photos = await db.query.recipePhotos.findMany({
    where: eq(recipePhotos.recipeId, Number(id)),
    orderBy: (p, { asc }) => [asc(p.sortOrder)],
  });
  return NextResponse.json(photos);
}

// PATCH — set a photo as the recipe cover image
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    if (!(await canUserEditRecipe(currentUser.id, recipeId))) {
      return NextResponse.json(
        { error: "You do not have permission to edit this recipe photos" },
        { status: 403 }
      );
    }

    const { photoUrl } = await request.json();

    if (!photoUrl) {
      return NextResponse.json({ error: "photoUrl is required" }, { status: 400 });
    }

    const photo = await db.query.recipePhotos.findFirst({
      where: and(
        eq(recipePhotos.recipeId, recipeId),
        eq(recipePhotos.blobUrl, photoUrl)
      ),
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    await db
      .update(recipes)
      .set({ imageUrl: photoUrl, updatedAt: new Date().toISOString() })
      .where(eq(recipes.id, recipeId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Set cover photo error:", error);
    return NextResponse.json({ error: "Failed to set cover photo" }, { status: 500 });
  }
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

    if (!(await canUserEditRecipe(currentUser.id, recipeId))) {
      return NextResponse.json(
        { error: "You do not have permission to edit this recipe photos" },
        { status: 403 }
      );
    }

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

    const check = await validateUpload(file, "image");
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    // Upload to Vercel Blob (server-chosen name and content type)
    const blob = await put(
      `recipes/${recipeId}/photos/${crypto.randomUUID()}.${check.ext}`,
      file,
      { access: "public", contentType: check.mime, addRandomSuffix: true }
    );

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

    // Auto-set as cover image if recipe has no cover yet
    if (!recipe.imageUrl) {
      await db
        .update(recipes)
        .set({ imageUrl: blob.url, updatedAt: new Date().toISOString() })
        .where(eq(recipes.id, recipeId));
    }

    await trackUsageEvent({
      userId: currentUser.id,
      eventName: "photo_uploaded",
      source: "recipe_photo",
      recipeId,
      properties: {
        file_type: file.type || null,
        file_size_bucket_kb: Math.ceil(file.size / 102400) * 100,
        auto_set_cover: !recipe.imageUrl,
      },
      path: requestPath(request),
    });

    return NextResponse.json(newPhoto, { status: 201 });
  } catch (error) {
    console.error("Photo upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}
