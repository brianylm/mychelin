import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { instructions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { INSTRUCTION_PATCH_FIELDS, pickPatchFields } from "@/lib/patch-fields";
import { canUserAccessRecipe, canUserEditRecipe } from "@/lib/recipe-access";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type RouteContext = {
  params: Promise<{ id: string; instructionId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, instructionId } = await context.params;

    if (!(await canUserAccessRecipe(currentUser.id, Number(id)))) {
      return NextResponse.json(
        { error: "Instruction not found" },
        { status: 404 }
      );
    }

    if (!(await canUserEditRecipe(currentUser.id, Number(id)))) {
      return NextResponse.json(
        { error: "You do not have permission to edit this recipe instructions" },
        { status: 403 }
      );
    }

    const updates = pickPatchFields(await request.json(), INSTRUCTION_PATCH_FIELDS);
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
    }

    const [updated] = await db
      .update(instructions)
      .set(updates as Partial<typeof instructions.$inferInsert>)
      .where(
        and(
          eq(instructions.id, Number(instructionId)),
          eq(instructions.recipeId, Number(id))
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Instruction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH instruction error:", error);
    return NextResponse.json(
      { error: "Failed to update instruction" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, instructionId } = await context.params;

    if (!(await canUserAccessRecipe(currentUser.id, Number(id)))) {
      return NextResponse.json(
        { error: "Instruction not found" },
        { status: 404 }
      );
    }

    if (!(await canUserEditRecipe(currentUser.id, Number(id)))) {
      return NextResponse.json(
        { error: "You do not have permission to edit this recipe instructions" },
        { status: 403 }
      );
    }

    const [deleted] = await db
      .delete(instructions)
      .where(
        and(
          eq(instructions.id, Number(instructionId)),
          eq(instructions.recipeId, Number(id))
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Instruction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("DELETE instruction error:", error);
    return NextResponse.json(
      { error: "Failed to delete instruction" },
      { status: 500 }
    );
  }
}
