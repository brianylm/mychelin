import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface ParsedRecipe {
  title?: string;
  description?: string;
  ingredients: Array<{ name: string; amount?: string; unit?: string; notes?: string }>;
  instructions: Array<{ step: number; text: string }>;
  cuisine?: string;
  category?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: "easy" | "medium" | "hard";
  story?: string;
  familyMember?: string;
  origin?: string;
  missingInfo: string[];
  clarifyingQuestions: string[];
  confidence: "low" | "medium" | "high";
}

// POST /api/ai-recipe-capture - Parse informal recipe description
export async function POST(request: NextRequest) {
  try {
    const { recipeText, conversationHistory = [] } = await request.json();

    if (!recipeText?.trim()) {
      return NextResponse.json({ error: "Recipe text is required" }, { status: 400 });
    }

    const prompt = `You are an expert at capturing family recipes from informal conversations. You help preserve traditional recipes by translating casual descriptions into structured formats.

CONTEXT: Someone is sharing a family recipe with you. They might use informal language, dialect, imprecise measurements, or assume knowledge. Your job is to extract what you can and identify what needs clarification.

CONVERSATION HISTORY:
${conversationHistory.map((msg: any, i: number) => `${i + 1}. ${msg.speaker}: ${msg.text}`).join('\n')}

NEW INPUT: "${recipeText}"

Parse this into a structured recipe format. Be especially good at:
- Recognizing Southeast Asian/Singaporean cooking terms and ingredients
- Understanding informal measurements ("a bit of", "until fragrant", "handful")
- Identifying missing critical information (exact amounts, timing, temperatures)
- Suggesting specific clarifying questions that will help complete the recipe

Return a JSON object with this structure:
{
  "title": "Best guess at recipe name",
  "description": "Brief description if available",
  "ingredients": [{"name": "ingredient", "amount": "quantity or null", "unit": "unit or null", "notes": "any prep notes"}],
  "instructions": [{"step": 1, "text": "instruction text"}],
  "cuisine": "cuisine type if identifiable",
  "category": "meal category if clear",
  "prepTime": "minutes as number or null",
  "cookTime": "minutes as number or null", 
  "servings": "number of servings or null",
  "difficulty": "easy/medium/hard or null",
  "story": "any family history or story mentioned",
  "familyMember": "who this recipe comes from",
  "origin": "where/when this recipe originated",
  "missingInfo": ["list of critical missing information"],
  "clarifyingQuestions": ["specific questions to ask the recipe giver"],
  "confidence": "low/medium/high based on completeness"
}

IMPORTANT GUIDELINES:
- Don't make up measurements - mark as null if unclear
- Be specific in clarifying questions ("How many tablespoons of soy sauce?" not "How much soy sauce?")
- Recognize common Southeast Asian ingredients and cooking methods
- If someone says "until fragrant" or "until golden", capture that exactly
- Ask about family context if it seems important
- Focus on practical clarifying questions that will actually help cook the dish

Be helpful, culturally aware, and focused on preserving the authentic family recipe.`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Extract JSON from Claude's response
    let jsonStart = content.text.indexOf("{");
    let jsonEnd = content.text.lastIndexOf("}") + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error("No JSON found in Claude's response");
    }

    const jsonString = content.text.slice(jsonStart, jsonEnd);
    const parsedRecipe: ParsedRecipe = JSON.parse(jsonString);

    return NextResponse.json(parsedRecipe);
  } catch (error) {
    console.error("Error processing recipe:", error);
    return NextResponse.json(
      { error: "Failed to process recipe. Please try again." },
      { status: 500 }
    );
  }
}