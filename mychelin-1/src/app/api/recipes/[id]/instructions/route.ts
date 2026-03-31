import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { instructions, recipes } from "@/db/schema";
import { eq, max } from "drizzle-orm";

export const preferredRegion = "hnd1";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const recipeId = Number(id);
    const body = await request.json();

    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
    });
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Get next step number
    const [maxStep] = await db
      .select({ max: max(instructions.stepNumber) })
      .from(instructions)
      .where(eq(instructions.recipeId, recipeId));
    const nextStep = (maxStep?.max ?? 0) + 1;

    const [newInstruction] = await db
      .insert(instructions)
      .values({
        recipeId,
        stepNumber: nextStep,
        content: body.content,
        tip: body.tip ?? null,
      })
      .returning();

    return NextResponse.json(newInstruction, { status: 201 });
  } catch (error) {
    console.error("POST instruction error:", error);
    return NextResponse.json(
      { error: "Failed to add instruction" },
      { status: 500 }
    );
  }
}
