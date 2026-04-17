import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB
const FETCH_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;

// Many recipe blogs embed structured data in JSON-LD <script> tags
// (schema.org/Recipe). This is the richest, most reliable source of
// recipe content — no HTML parsing ambiguity, no JS-rendering issues.
function extractJsonLdRecipe(html: string): string | null {
  const ldMatches = html.match(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!ldMatches) return null;

  for (const match of ldMatches) {
    const inner = match.replace(/<script[^>]*>|<\/script>/gi, "").trim();
    try {
      const parsed = JSON.parse(inner);
      // Could be a single object or an array
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        // Direct Recipe type
        if (item["@type"] === "Recipe" || item["@type"]?.includes?.("Recipe")) {
          return JSON.stringify(item, null, 2);
        }
        // Nested in @graph
        if (item["@graph"]) {
          const recipe = item["@graph"].find(
            (g: any) => g["@type"] === "Recipe" || g["@type"]?.includes?.("Recipe")
          );
          if (recipe) return JSON.stringify(recipe, null, 2);
        }
      }
    } catch {
      // Malformed JSON-LD, skip
    }
  }
  return null;
}

function stripHtmlToText(html: string): string {
  let text = html;

  // Remove script/style/noscript blocks entirely
  text = text.replace(/<(script|style|noscript|svg|head)[^>]*>[\s\S]*?<\/\1>/gi, "");

  // Convert common block elements to newlines
  text = text.replace(/<\/(p|div|li|h[1-6]|tr|blockquote|section|article)>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "- ");

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, " ");

  // Collapse whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n[ \t]+/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

// POST /api/capture/url
//
// Fetches a URL, strips HTML to readable text, and (optionally) pipes
// it through Gemini to extract a structured recipe. Returns both the
// raw stripped text and the extracted recipe so the client can preview
// before applying.
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { url?: string };
    const rawUrl = body.url?.trim() ?? "";
    if (!rawUrl) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 }
      );
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json(
        { error: "Only http and https URLs are supported" },
        { status: 400 }
      );
    }

    // Fetch the page with timeout and redirect limit
    let response: Response;
    try {
      response = await fetch(parsed.href, {
        headers: {
          "User-Agent": "Mychelin/1.0 (recipe importer)",
          Accept: "text/html, application/xhtml+xml, */*;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (err: any) {
      if (err?.name === "TimeoutError" || err?.name === "AbortError") {
        return NextResponse.json(
          { error: "The page took too long to respond" },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: "Could not fetch the URL" },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Page returned ${response.status}` },
        { status: 502 }
      );
    }

    // Verify we got something resembling HTML
    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      return NextResponse.json(
        { error: "URL did not return an HTML page" },
        { status: 422 }
      );
    }

    // Check redirects didn't go past the limit
    if (response.redirected) {
      const finalUrl = new URL(response.url);
      if (finalUrl.origin !== parsed.origin) {
        // Cross-origin redirect — still allow, just note it
      }
    }

    // Read body with size limit
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { error: "Empty response body" },
        { status: 502 }
      );
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        reader.cancel();
        return NextResponse.json(
          { error: "Page is too large (max 2 MB)" },
          { status: 413 }
        );
      }
      chunks.push(value);
    }

    const html = new TextDecoder().decode(
      chunks.length === 1
        ? chunks[0]
        : chunks.reduce((acc, chunk) => {
            const merged = new Uint8Array(acc.length + chunk.length);
            merged.set(acc);
            merged.set(chunk, acc.length);
            return merged;
          }, new Uint8Array())
    );

    // Prefer JSON-LD structured data (schema.org/Recipe) — most recipe
    // blogs include it for SEO and it's far more reliable than scraping
    // the rendered HTML, which may require JS to populate.
    const jsonLd = extractJsonLdRecipe(html);
    const text = jsonLd || stripHtmlToText(html);

    if (text.length < 20) {
      return NextResponse.json(
        { error: "Could not extract meaningful text from the page" },
        { status: 422 }
      );
    }

    // Truncate to the paste endpoint's limit so Gemini doesn't choke
    const trimmedText = text.length > 20000 ? text.slice(0, 20000) : text;

    // Now pipe through Gemini for structured extraction (same as /api/capture/paste)
    const apiKey =
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // No Gemini key — return raw text only, client can still save as draft
      return NextResponse.json({
        text: trimmedText,
        sourceUrl: parsed.href,
        recipe: null,
      });
    }

    const prompt = `You are extracting a structured recipe from text that was scraped from a webpage. The text will contain navigation, ads, comments, and other non-recipe content — ignore everything that isn't part of the recipe itself.

SCRAPED TEXT:
"""
${trimmedText}
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
  "story": "any context or backstory explicitly included in the text, or empty string"
}

Guidelines:
- Preserve the original language and script — if the recipe is in Chinese characters, keep it in Chinese.
- Use null for missing numeric values, empty string for missing text.
- Step numbers should start at 1 and increment.
- If the text clearly isn't a recipe (random article, etc.), still try to return the shape but with empty fields.
- Do NOT wrap the JSON in markdown code fences.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error("Gemini URL-extract error:", geminiRes.status, errBody);
      // Still return the raw text so the client can save as draft
      return NextResponse.json({
        text: trimmedText,
        sourceUrl: parsed.href,
        recipe: null,
      });
    }

    const data = await geminiRes.json();
    const generatedText: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return NextResponse.json({
        text: trimmedText,
        sourceUrl: parsed.href,
        recipe: null,
      });
    }

    let extractedRecipe;
    try {
      const cleaned = generatedText.replace(/```json\n?|\n?```/g, "").trim();
      extractedRecipe = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Gemini URL-extract JSON:", generatedText);
      return NextResponse.json({
        text: trimmedText,
        sourceUrl: parsed.href,
        recipe: null,
      });
    }

    // Validate that the extraction actually found something meaningful.
    // Many pages are JS-rendered or behind bot-detection so Gemini gets
    // empty text and returns a hollow recipe object. Treat that as a
    // failed extraction so the client can fall back to saving raw text.
    const hasTitle = !!extractedRecipe?.title?.trim();
    const hasIngredients = (extractedRecipe?.ingredients?.length ?? 0) > 0;
    const hasInstructions = (extractedRecipe?.instructions?.length ?? 0) > 0;

    if (!hasTitle && !hasIngredients && !hasInstructions) {
      return NextResponse.json({
        text: trimmedText,
        sourceUrl: parsed.href,
        recipe: null,
      });
    }

    return NextResponse.json({
      text: trimmedText,
      sourceUrl: parsed.href,
      recipe: extractedRecipe,
    });
  } catch (error) {
    console.error("POST /api/capture/url error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
