import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// POST /api/capture/paste
//
// Takes a blob of pasted text (from a webpage, a messaging app, an
// OCR'd cookbook page, wherever) and asks Gemini to extract a clean
// structured recipe from it. Returns the same shape as the existing
// /api/capture/extract endpoint so the client can PATCH it straight
// into an existing recipe via /api/recipes/[id].
export async function POST(request: NextRequest) {
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
            "AI extraction is not configured. Add a GOOGLE_API_KEY (or GEMINI_API_KEY) environment variable in Vercel with a Gemini API key from https://aistudio.google.com/apikey.",
        },
        { status: 503 }
      );
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

    // Try models in order of preference. If a model returns "overloaded"
    // (503) or "rate limited" (429), fall through to the next one.
    // gemini-2.5-flash is the primary model (confirmed available on this
    // project's API key). gemini-2.0-flash is a secondary fallback that
    // tends to be less loaded.
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash"];
    const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    });

    let geminiRes: Response | null = null;
    let lastErrorBody = "";
    let lastErrorStatus = 0;

    for (const model of modelsToTry) {
      // Retry this model up to 2 times on transient overload before
      // falling through to the next model. Short backoff to stay well
      // under Vercel's 25s edge timeout.
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
          }
        );

        if (res.ok) {
          geminiRes = res;
          break;
        }

        lastErrorStatus = res.status;
        lastErrorBody = await res.text();

        // Only retry on transient errors (429 rate limit, 5xx overload)
        const isTransient = res.status === 429 || res.status >= 500;
        if (!isTransient) break;

        if (attempt === 0) {
          // Quick 600ms backoff before the second attempt
          await new Promise((r) => setTimeout(r, 600));
        }
      }

      if (geminiRes) break;
    }

    if (!geminiRes) {
      console.error(
        "Gemini paste-extract exhausted all models:",
        lastErrorStatus,
        lastErrorBody
      );
      let detail = "Extraction failed";
      try {
        const parsed = JSON.parse(lastErrorBody);
        detail = parsed?.error?.message || detail;
      } catch { /* keep default */ }
      return NextResponse.json({ error: detail }, { status: 502 });
    }

    const data = await geminiRes.json();
    // Gemini 2.5 may include a thinking part before the text part —
    // walk the parts array to find the actual text output.
    const parts: Array<{ text?: string }> =
      data?.candidates?.[0]?.content?.parts ?? [];
    const generatedText: string | undefined =
      parts.find((p) => typeof p.text === "string")?.text;
    if (!generatedText) {
      return NextResponse.json(
        { error: "Empty response from extractor" },
        { status: 502 }
      );
    }

    let extractedRecipe;
    try {
      const cleaned = generatedText.replace(/```json\n?|\n?```/g, "").trim();
      extractedRecipe = JSON.parse(cleaned);
    } catch (err) {
      console.error("Failed to parse Gemini paste JSON:", generatedText);
      return NextResponse.json(
        { error: "Could not parse extracted recipe" },
        { status: 502 }
      );
    }

    return NextResponse.json({ recipe: extractedRecipe });
  } catch (error) {
    console.error("POST /api/capture/paste error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
