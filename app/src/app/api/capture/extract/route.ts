import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { callDeepSeekJson, isDeepSeekConfigured } from "@/lib/deepseek";

export const runtime = "edge";
export const preferredRegion = "hnd1";

interface ConversationMessage {
  speaker: string;
  text: string;
  language: string;
  timestamp: string;
}

interface ExtractRequest {
  conversation: ConversationMessage[];
}

function cleanJson(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function geminiKey(): string {
  return process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
}

async function callGeminiExtract(apiKey: string, prompt: string): Promise<string> {
  const model = "gemini-2.5-flash";
  const geminiResponse = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!geminiResponse.ok) {
    const text = await geminiResponse.text();
    throw new Error("Gemini failed: " + geminiResponse.status + " " + text.slice(0, 240));
  }

  const geminiData = await geminiResponse.json();
  const generatedText: string | undefined = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!generatedText) throw new Error("Gemini returned no recipe data");
  return generatedText;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { conversation }: ExtractRequest = await request.json();

    if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
      return NextResponse.json(
        { error: "Conversation data is required" },
        { status: 400 }
      );
    }

    const conversationText = conversation
      .map((msg) => `${msg.speaker}: ${msg.text}`)
      .join("\n");

    const prompt = `
You are a helpful assistant that extracts structured recipe information from conversations between people sharing heritage recipes.

Please analyze this conversation and extract a structured recipe in JSON format:

CONVERSATION:
${conversationText}

Extract the following information in JSON format:
{
  "title": "Recipe name (if mentioned, otherwise infer from context)",
  "description": "Brief description of the dish",
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": number or null,
      "unit": "unit of measurement or null",
      "notes": "any special notes about this ingredient"
    }
  ],
  "instructions": [
    {
      "stepNumber": 1,
      "content": "detailed instruction step",
      "tip": "any cooking tips or advice mentioned"
    }
  ],
  "yield": "how many servings (if mentioned)",
  "prepTime": "preparation time (if mentioned)",
  "cookTime": "cooking time (if mentioned)",
  "cuisine": "type of cuisine (if identifiable)",
  "origin": "cultural origin or region (if mentioned)",
  "dialect": "language or dialect used (if identifiable)",
  "occasion": "when this dish is typically made (if mentioned)",
  "familyMember": "who taught this recipe or family connection (if mentioned)",
  "story": "any cultural context, family memories, or stories shared about this recipe"
}

Guidelines:
- Extract only information that is explicitly mentioned or clearly implied.
- Use null for missing numeric values, empty string for missing text.
- Preserve the cultural context, original dish terms, dialect words, and emotional significance.
- Include any cooking tips, family secrets, or traditional methods mentioned.
- If ingredients or steps are unclear, preserve uncertainty in notes/tips instead of inventing precision.

Return only the JSON object, no additional text.`;

    let generatedText = "";
    let lastError = "";

    if (isDeepSeekConfigured()) {
      try {
        const deepseek = await callDeepSeekJson({
          system: "You extract heritage recipe conversations into strict JSON. Preserve uncertainty and family terms. No prose, no markdown.",
          prompt,
          temperature: 0.2,
          maxTokens: 4096,
        });
        generatedText = deepseek.text;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "DeepSeek failed";
        console.error("DeepSeek extraction error:", lastError.slice(0, 240));
      }
    }

    if (!generatedText && geminiKey()) {
      try {
        generatedText = await callGeminiExtract(geminiKey(), prompt);
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Gemini failed";
        console.error("Gemini extraction error:", lastError.slice(0, 240));
      }
    }

    if (!generatedText) {
      return NextResponse.json(
        {
          error: isDeepSeekConfigured() || geminiKey()
            ? "Failed to process conversation"
            : "AI extraction is not configured. Add DEEPSEEK_API_KEY for DeepSeek recipe extraction.",
          detail: lastError ? lastError.slice(0, 180) : undefined,
        },
        { status: isDeepSeekConfigured() || geminiKey() ? 502 : 503 }
      );
    }

    let extractedRecipe;
    try {
      extractedRecipe = JSON.parse(cleanJson(generatedText));
    } catch (parseError) {
      console.error("Failed to parse extraction response:", parseError, "Response:", generatedText);
      return NextResponse.json(
        { error: "Failed to parse recipe data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recipe: extractedRecipe,
    });
  } catch (error) {
    console.error("POST /api/capture/extract error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
