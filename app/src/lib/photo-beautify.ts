import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipePhotos } from "@/db/schema";
import { ensureRecipePhotoSourceColumns } from "@/db/ensure-schema";
import { beautifyFoodPhoto } from "@/lib/ai-image";
import { generatedVariantOf } from "@/lib/recipe-photo-display";

export type BeautifyResult =
  | { status: "ready"; photo: typeof recipePhotos.$inferSelect }
  | { status: "not_found" }
  | { status: "fetch_failed" };

// Generates (or returns the existing) AI-beautified variant of a source
// photo. Caller handles permission; this is idempotent — repeat calls
// return the already-generated row. Throws AiImageError on provider
// failure so callers can map the error kind to a response.
export async function beautifyRecipePhoto(
  recipeId: number,
  sourcePhotoId: number
): Promise<BeautifyResult> {
  await ensureRecipePhotoSourceColumns();

  const photos = await db
    .select()
    .from(recipePhotos)
    .where(eq(recipePhotos.recipeId, recipeId));

  const source = photos.find((p) => p.id === sourcePhotoId && p.source !== "generated");
  if (!source) return { status: "not_found" };

  const existing = generatedVariantOf(
    photos.map((p) => ({ id: p.id, blobUrl: p.blobUrl, source: p.source, sourcePhotoId: p.sourcePhotoId, sortOrder: p.sortOrder })),
    sourcePhotoId
  );
  if (existing) {
    const photo = photos.find((p) => p.id === existing.id)!;
    return { status: "ready", photo };
  }

  const res = await fetch(source.blobUrl, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return { status: "fetch_failed" };
  const bytes = new Uint8Array(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") || "image/jpeg";

  const png = await beautifyFoodPhoto(bytes, mimeType);

  const blob = await put(
    `recipes/${recipeId}/photos/generated-${sourcePhotoId}-${Date.now()}.png`,
    new Blob([png.buffer as ArrayBuffer], { type: "image/png" }),
    { access: "public", contentType: "image/png" }
  );

  const maxSort = Math.max(0, ...photos.map((p) => p.sortOrder ?? 0));
  const [row] = await db
    .insert(recipePhotos)
    .values({
      recipeId,
      blobUrl: blob.url,
      source: "generated",
      sourcePhotoId,
      sortOrder: maxSort + 1,
      createdAt: new Date().toISOString(),
    })
    .returning();

  return { status: "ready", photo: row };
}
