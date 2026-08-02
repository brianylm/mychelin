import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shareLinks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSharedRecipeDTO, isRecipeInSharedBook } from "@/lib/shared-recipe";
import { coverPhoto, generatedVariantOf } from "@/lib/recipe-photo-display";
import { beautifyRecipePhoto } from "@/lib/photo-beautify";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ token: string }> };

function unavailable() {
  // The public page treats beautification as a progressive enhancement —
  // any failure (no key, provider down, timeout, no photos) just means
  // the original photo stays. Never surface an error to share visitors.
  return NextResponse.json({ status: "unavailable" });
}

// ─── POST /api/share/:token/beautify ───────────────────────
// Auto-beautify the shared recipe's cover photo on first view.
// Token-gated and idempotent: the first call paints, later calls
// return the already-generated variant.
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;

    const link = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.token, token))
      .limit(1);

    if (!link.length) {
      return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 });
    }

    const shareLink = link[0];
    let recipeId: number | null = null;

    if (shareLink.resourceType === "recipe") {
      recipeId = shareLink.resourceId;
    } else if (shareLink.resourceType === "book") {
      const requested = Number(request.nextUrl.searchParams.get("recipeId"));
      if (Number.isFinite(requested) && (await isRecipeInSharedBook(requested, shareLink.resourceId))) {
        recipeId = requested;
      }
    }

    if (!recipeId) return unavailable();

    const recipe = await getSharedRecipeDTO(recipeId);
    if (!recipe) return unavailable();

    const cover = coverPhoto(recipe.photos, recipe.imageUrl);
    if (!cover) return unavailable();

    const existing = generatedVariantOf(recipe.photos, cover.id);
    if (existing) {
      return NextResponse.json({ status: "ready", photoUrl: existing.blobUrl });
    }

    const result = await beautifyRecipePhoto(recipeId, cover.id);
    if (result.status !== "ready") return unavailable();

    return NextResponse.json({ status: "ready", photoUrl: result.photo.blobUrl });
  } catch (error) {
    console.error("POST /api/share/[token]/beautify error:", error);
    return unavailable();
  }
}
