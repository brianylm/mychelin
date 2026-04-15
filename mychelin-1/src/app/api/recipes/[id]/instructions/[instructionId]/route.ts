import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { instructions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessRecipe } from "@/lib/recipe-access";

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

    const body = await request.json();

    const [updated] = await db
      .update(instructions)
      .set(body)
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
