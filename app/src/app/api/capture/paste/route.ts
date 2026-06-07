import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { extractRecipeText } from "@/lib/ai-extract";
import { requestPath, trackUsageEvent } from "@/lib/usage-events";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// POST /api/capture/paste
//
// Takes a blob of pasted text (from a webpage, a messaging app, an
// OCR'd cookbook page, wherever) and asks an AI provider (Gemini
// primary, MiniMax fallback) to extract a clean structured recipe
// from it. Returns the same shape as the existing /api/capture/extract
// endpoint so the client can PATCH it straight into an existing
// recipe via /api/recipes/[id].
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim() ?? "";
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    if (text.length > 20000) {
      return NextResponse.json(
        { error: "Pasted text is too long (max ~20000 characters)" },
        { status: 400 }
      );
    }

    const prompt = `You are extracting a structured recipe from pasted text. The text might be copied from a webpage, a messaging app, a photo OCR, a cookbook, or any other source. It may contain unrelated fluff (ads, navigation, comments) alongside the actual recipe — ignore anything that isn't part of the recipe itself.

PASTED TEXT:
"""
${text}
"""

Return STRICT JSON only (no prose, no markdown fences), matching exactly this shape:

{
  "title": "Recipe name (infer from context if not explicit)",
  "description": "Short 1-sentence description",
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": <number or null>,
      "unit": "unit of measurement or null",
      "notes": "any special notes about this ingredient, or empty string"
    }
  ],
  "instructions": [
    {
      "stepNumber": 1,
      "content": "detailed instruction step",
      "tip": "any cooking tips or advice mentioned, or empty string"
    }
  ],
  "yield": "how many servings (if mentioned)",
  "prepTime": "preparation time in minutes as a string, or empty",
  "cookTime": "cooking time in minutes as a string, or empty",
  "cuisine": "type of cuisine if identifiable, or empty string",
  "origin": "cultural origin or region, or empty string",
  "dialect": "",
  "occasion": "",
  "familyMember": "",
  "story": "any context or backstory explicitly included in the pasted text, or empty string"
}

Guidelines:
- Preserve the original language and script — if the recipe is in Chinese characters, keep it in Chinese.
- Use null for missing numeric values, empty string for missing text.
- Step numbers should start at 1 and increment.
- If the text clearly isn't a recipe (random article, etc.), still try to return the shape but with empty fields.
- Do NOT wrap the JSON in markdown code fences.`;

    const extracted = await extractRecipeText(prompt);
    if (!extracted.ok) {
      return NextResponse.json(
        { error: extracted.error.message },
        { status: extracted.error.status }
      );
    }

    let extractedRecipe;
    try {
      const cleaned = extracted.result.text
        .replace(/```json\n?|\n?```/g, "")
        .trim();
      extractedRecipe = JSON.parse(cleaned);
    } catch {
      console.error(
        "Failed to parse extracted JSON:",
        extracted.result.provider,
        extracted.result.text
      );
      return NextResponse.json(
        { error: "Could not parse extracted recipe" },
        { status: 502 }
      );
    }

    await trackUsageEvent({
      userId: user.id,
      eventName: "recipe_capture_completed",
      source: "paste",
      properties: {
        provider: extracted.result.provider,
        model: extracted.result.model,
        input_chars_bucket: Math.ceil(text.length / 500) * 500,
        ingredients_count: Array.isArray(extractedRecipe?.ingredients) ? extractedRecipe.ingredients.length : 0,
        steps_count: Array.isArray(extractedRecipe?.instructions) ? extractedRecipe.instructions.length : 0,
      },
      path: requestPath(request),
    });

    return NextResponse.json({
      recipe: extractedRecipe,
      provider: extracted.result.provider,
      model: extracted.result.model,
    });
  } catch (error) {
    console.error("POST /api/capture/paste error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
