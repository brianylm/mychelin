import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

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

export async function POST(request: NextRequest) {
  try {
    // Check authentication
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

    // Get Gemini API key
    const apiKey =
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing Google API key");
      return NextResponse.json(
        {
          error:
            "AI extraction is not configured. Add a GOOGLE_API_KEY (or GEMINI_API_KEY) environment variable in Vercel with a Gemini API key from https://aistudio.google.com/apikey.",
        },
        { status: 503 }
      );
    }

    // Format conversation for Gemini
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
- Extract only information that is explicitly mentioned or clearly implied
- Use null for missing numeric values, empty string for missing text
- Preserve the cultural context and emotional significance
- Include any cooking tips, family secrets, or traditional methods mentioned
- If ingredients or steps are unclear, use the most reasonable interpretation

Return only the JSON object, no additional text.`;

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", geminiResponse.statusText);
      return NextResponse.json(
        { error: "Failed to process conversation" },
        { status: 500 }
      );
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error("No response from Gemini:", geminiData);
      return NextResponse.json(
        { error: "No recipe data generated" },
        { status: 500 }
      );
    }

    // Parse the JSON response from Gemini
    let extractedRecipe;
    try {
      // Clean up the response - remove markdown code blocks if present
      const cleanedText = generatedText.replace(/```json\n?|\n?```/g, "").trim();
      extractedRecipe = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError, "Response:", generatedText);
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