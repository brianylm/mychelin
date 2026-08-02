import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe, canUserEditRecipe } from "@/lib/recipe-access";
import { AiImageError } from "@/lib/ai-image";
import { beautifyRecipePhoto } from "@/lib/photo-beautify";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string; photoId: string }> };

// ─── POST /api/recipes/:id/photos/:photoId/beautify ────────
// Generates (or returns the existing) AI painterly variant of a photo.
// Idempotent — repeat calls return the already-generated row.
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, photoId } = await context.params;
    const recipeId = Number(id);
    const sourcePhotoId = Number(photoId);

    if (!(await canUserAccessRecipe(currentUser.id, recipeId))) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    if (!(await canUserEditRecipe(currentUser.id, recipeId))) {
      return NextResponse.json(
        { error: "You do not have permission to edit this recipe" },
        { status: 403 }
      );
    }

    const result = await beautifyRecipePhoto(recipeId, sourcePhotoId);
    if (result.status === "not_found") {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }
    if (result.status === "fetch_failed") {
      return NextResponse.json(
        { error: "Couldn't read the original photo" },
        { status: 502 }
      );
    }

    return NextResponse.json(result.photo, { status: 201 });
  } catch (error) {
    if (error instanceof AiImageError) {
      if (error.kind === "not_configured") {
        return NextResponse.json(
          { error: "Image beautification isn't set up yet", details: error.message },
          { status: 503 }
        );
      }
      if (error.kind === "timeout") {
        return NextResponse.json(
          { error: "The painting took too long — try again" },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: "Image generation failed — try again", details: error.message.slice(0, 200) },
        { status: 502 }
      );
    }
    console.error("POST /api/recipes/[id]/photos/[photoId]/beautify error:", error);
    return NextResponse.json(
      { error: "Failed to beautify photo" },
      { status: 500 }
    );
  }
}
