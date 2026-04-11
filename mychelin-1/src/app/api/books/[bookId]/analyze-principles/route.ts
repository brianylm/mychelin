import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { books, bookRecipes, recipes, ingredients, instructions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, inArray } from "drizzle-orm";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// POST /api/books/[bookId]/analyze-principles
//
// Reads every recipe in the given book (title, ingredients, instructions,
// story metadata) and asks Gemini to identify notable patterns — things
// like "this book rarely uses salt, seasoning comes from sugar + light
// soy sauce" or "everything here is stir-fried" or "all recipes use
// dark soy sauce as a base". Returns a list of suggested principles
// the user can review and save to the book with one tap.
//
// Response:
//   { principles: [ "...", "..." ] }
//
// Empty array if there aren't enough recipes to draw a pattern.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey =
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "AI analysis is not configured. Add a GOOGLE_API_KEY (or GEMINI_API_KEY) environment variable in Vercel with a Gemini API key from https://aistudio.google.com/apikey.",
        },
        { status: 503 }
      );
    }

    const { bookId: bookIdParam } = await params;
    const bookId = parseInt(bookIdParam);
    if (!bookId || Number.isNaN(bookId)) {
      return NextResponse.json({ error: "Invalid book id" }, { status: 400 });
    }

    // Verify the book exists. (Membership scoping is lax on this project
    // and matches the existing books routes, so we don't re-gate here.)
    const [book] = await db
      .select()
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Fetch all recipes in this book.
    const bookRecipeRows = await db
      .select({ recipeId: bookRecipes.recipeId })
      .from(bookRecipes)
      .where(eq(bookRecipes.bookId, bookId));
    const recipeIds = bookRecipeRows.map((r) => r.recipeId);

    if (recipeIds.length === 0) {
      return NextResponse.json({ principles: [] });
    }

    const recipeRows = await db
      .select({
        id: recipes.id,
        title: recipes.title,
        cuisine: recipes.cuisine,
        origin: recipes.origin,
        dialect: recipes.dialect,
        story: recipes.story,
      })
      .from(recipes)
      .where(inArray(recipes.id, recipeIds));

    const ingredientRows = await db
      .select({
        recipeId: ingredients.recipeId,
        name: ingredients.name,
        quantity: ingredients.quantity,
        unit: ingredients.unit,
      })
      .from(ingredients)
      .where(inArray(ingredients.recipeId, recipeIds));

    const instructionRows = await db
      .select({
        recipeId: instructions.recipeId,
        stepNumber: instructions.stepNumber,
        content: instructions.content,
      })
      .from(instructions)
      .where(inArray(instructions.recipeId, recipeIds));

    // Group ingredients / instructions by recipe
    const ingByRecipe = new Map<number, typeof ingredientRows>();
    for (const ing of ingredientRows) {
      const list = ingByRecipe.get(ing.recipeId) ?? [];
      list.push(ing);
      ingByRecipe.set(ing.recipeId, list);
    }
    const instByRecipe = new Map<number, typeof instructionRows>();
    for (const inst of instructionRows) {
      const list = instByRecipe.get(inst.recipeId) ?? [];
      list.push(inst);
      instByRecipe.set(inst.recipeId, list);
    }

    // Build a compact text blob of each recipe for the prompt.
    const recipeBlocks = recipeRows.map((r) => {
      const ings = (ingByRecipe.get(r.id) ?? [])
        .map(
          (i) =>
            `  - ${i.name}${
              i.quantity != null ? ` (${i.quantity}${i.unit ? " " + i.unit : ""})` : ""
            }`
        )
        .join("\n");
      const insts = (instByRecipe.get(r.id) ?? [])
        .sort((a, b) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0))
        .map((i) => `  ${i.stepNumber}. ${i.content}`)
        .join("\n");
      return [
        `# ${r.title}${r.cuisine ? ` (${r.cuisine})` : ""}`,
        r.origin ? `Origin: ${r.origin}` : null,
        r.dialect ? `Dialect: ${r.dialect}` : null,
        r.story ? `Story: ${r.story}` : null,
        ings ? `Ingredients:\n${ings}` : null,
        insts ? `Steps:\n${insts}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    });

    const prompt = `You are analysing a family cookbook called "${book.title}" to surface the guiding principles that make it distinctive.

Read every recipe below and identify patterns — things like:
  • Which seasonings / flavouring agents dominate (and which are notably absent)?
  • Shared cooking techniques or equipment.
  • Ingredient preferences or substitutions that appear repeatedly.
  • Dialect, region, or generational signals.
  • Any "house style" quirks a family member would notice.

Return 3–6 concise principles in STRICT JSON only, no markdown fences:

{
  "principles": [
    "Short, direct sentence stating the pattern. Written in plain English.",
    "Another pattern."
  ]
}

Guidelines:
 • Each principle should be a single sentence, 15–30 words.
 • State it as a rule someone cooking from this book could follow, not as an observation about the data. e.g. "Season with sugar and light soy sauce rather than salt — salt appears in only one recipe."
 • Only include patterns you can actually see in the recipes, not generic cooking wisdom.
 • If there aren't enough recipes to see a pattern, return an empty principles array.
 • Do NOT wrap the JSON in markdown code fences.

RECIPES (${recipeBlocks.length}):

${recipeBlocks.join("\n\n---\n\n")}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const body = await geminiRes.text();
      console.error("Gemini analyze-principles error:", geminiRes.status, body);
      return NextResponse.json(
        { error: "Analysis failed" },
        { status: 502 }
      );
    }

    const data = await geminiRes.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ principles: [] });
    }

    let parsed: { principles?: unknown };
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Gemini analyze response:", text);
      return NextResponse.json({ principles: [] });
    }

    const principles = Array.isArray(parsed.principles)
      ? parsed.principles
          .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
          .map((p) => p.trim())
          .slice(0, 8)
      : [];

    return NextResponse.json({ principles });
  } catch (error) {
    console.error("POST /api/books/[bookId]/analyze-principles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
