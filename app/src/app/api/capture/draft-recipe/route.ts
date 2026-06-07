import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requestPath, trackUsageEvent } from "@/lib/usage-events";

export const runtime = "edge";
export const preferredRegion = "hnd1";

interface DraftRecipe {
  title: string;
  description?: string;
  cuisine?: string;
  yield?: string;
  prepTime?: number | null;
  cookTime?: number | null;
  story?: string;
  ingredients: Array<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    approximate?: boolean;
    quantityText?: string | null;
    notes?: string;
  }>;
  instructions: Array<{
    content: string;
    tip?: string;
  }>;
}

function draftPrompt(request: string): string {
  return `Create an editable first-draft home cooking recipe from this request:

${request}

Return strict JSON only, no markdown, matching this exact shape:
{
  "title": "short recipe title",
  "description": "1-2 sentence dish description",
  "cuisine": "cuisine or null",
  "yield": "servings text, e.g. 2 servings",
  "prepTime": 15,
  "cookTime": 30,
  "story": "brief note on assumptions and what the user should verify",
  "ingredients": [
    { "name": "ingredient", "quantity": 1, "unit": "tbsp", "approximate": false, "quantityText": null, "notes": "optional prep note" }
  ],
  "instructions": [
    { "content": "one clear cooking step", "tip": "optional sensory cue or timing tip" }
  ]
}

Rules:
- This is a first draft, not a definitive family recipe.
- Prefer practical Singapore/home-cooking assumptions when the request is ambiguous.
- Keep steps granular enough for cook-with-me timers; do not combine multiple timed actions in one step.
- Preserve uncertainty in story rather than pretending to know family-specific details.
- Use null for unknown numeric values.
- Keep ingredients and steps realistic for a normal home kitchen.`;
}

function cleanJson(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function envValue(name: string): string {
  return process.env[name]?.trim() || "";
}

function deepSeekModel(): string {
  return envValue("DEEPSEEK_MODEL") || "deepseek-v4-flash";
}

function providerState() {
  return {
    deepseekConfigured: Boolean(envValue("DEEPSEEK_API_KEY")),
    deepseekModel: deepSeekModel(),
    geminiConfigured: Boolean(
      envValue("GOOGLE_API_KEY") || envValue("GOOGLE_AI_API_KEY") || envValue("GEMINI_API_KEY")
    ),
  };
}

function normalizeRecipe(value: unknown): DraftRecipe {
  const input = value as Partial<DraftRecipe>;
  const title = typeof input.title === "string" && input.title.trim()
    ? input.title.trim()
    : "Draft recipe";
  const ingredients = Array.isArray(input.ingredients)
    ? input.ingredients
        .map((item) => item as DraftRecipe["ingredients"][number])
        .filter((item) => item && typeof item.name === "string" && item.name.trim())
        .map((item) => ({
          name: item.name.trim(),
          quantity: typeof item.quantity === "number" ? item.quantity : null,
          unit: typeof item.unit === "string" ? item.unit : null,
          approximate: Boolean(item.approximate),
          quantityText: typeof item.quantityText === "string" ? item.quantityText : null,
          notes: typeof item.notes === "string" ? item.notes : "",
        }))
    : [];
  const instructions = Array.isArray(input.instructions)
    ? input.instructions
        .map((item) => item as DraftRecipe["instructions"][number])
        .filter((item) => item && typeof item.content === "string" && item.content.trim())
        .map((item) => ({
          content: item.content.trim(),
          tip: typeof item.tip === "string" ? item.tip : "",
        }))
    : [];

  return {
    title,
    description: typeof input.description === "string" ? input.description : "",
    cuisine: typeof input.cuisine === "string" ? input.cuisine : "",
    yield: typeof input.yield === "string" ? input.yield : "",
    prepTime: typeof input.prepTime === "number" ? input.prepTime : null,
    cookTime: typeof input.cookTime === "number" ? input.cookTime : null,
    story: typeof input.story === "string" ? input.story : "",
    ingredients,
    instructions,
  };
}

async function generateWithDeepSeek(prompt: string): Promise<{ recipe: DraftRecipe; provider: string }> {
  const apiKey = envValue("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY missing");

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: deepSeekModel(),
      messages: [
        {
          role: "system",
          content: "You create careful, editable first-draft home cooking recipes as strict JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      temperature: 0.3,
      max_tokens: 2200,
      stream: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error("DeepSeek failed: " + response.status + " " + text.slice(0, 160));
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned no content");
  return { recipe: normalizeRecipe(JSON.parse(cleanJson(content))), provider: deepSeekModel() };
}

async function generateWithGemini(prompt: string): Promise<{ recipe: DraftRecipe; provider: string }> {
  const apiKey = envValue("GOOGLE_API_KEY") || envValue("GOOGLE_AI_API_KEY") || envValue("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Gemini key missing");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2200,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error("Gemini failed: " + response.status + " " + text.slice(0, 160));
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Gemini returned no content");
  return { recipe: normalizeRecipe(JSON.parse(cleanJson(content))), provider: "gemini-2.5-flash" };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { prompt?: string };
    const userPrompt = body.prompt?.trim();
    if (!userPrompt || userPrompt.length < 4) {
      return NextResponse.json({ error: "Tell Mychelin what you want to cook" }, { status: 400 });
    }

    const prompt = draftPrompt(userPrompt.slice(0, 2000));
    try {
      const result = await generateWithDeepSeek(prompt);
      await trackUsageEvent({
        userId: user.id,
        eventName: "ai_draft_completed",
        source: "ask_mychelin",
        properties: {
          provider: result.provider,
          ingredients_count: result.recipe.ingredients.length,
          steps_count: result.recipe.instructions.length,
        },
        path: requestPath(request),
      });
      return NextResponse.json(result);
    } catch (deepSeekError) {
      console.warn("DeepSeek draft unavailable, trying Gemini fallback:", deepSeekError);
      try {
        const result = await generateWithGemini(prompt);
        await trackUsageEvent({
          userId: user.id,
          eventName: "ai_draft_completed",
          source: "ask_mychelin",
          properties: {
            provider: result.provider,
            ingredients_count: result.recipe.ingredients.length,
            steps_count: result.recipe.instructions.length,
          },
          path: requestPath(request),
        });
        return NextResponse.json(result);
      } catch (geminiError) {
        console.error("Draft recipe generation failed:", { deepSeekError, geminiError });
        return NextResponse.json(
          {
            error: "AI drafting is unavailable. Provider configuration or provider response failed.",
            providers: providerState(),
          },
          { status: 503 }
        );
      }
    }
  } catch (error) {
    console.error("POST /api/capture/draft-recipe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
