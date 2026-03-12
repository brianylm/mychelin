import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface ConversationContext {
  participants: {
    giver: { name: string; language: string; dialect?: string };
    recipient: { name: string; language: string };
  };
  topic: string;
  conversationHistory: Array<{
    speaker: "giver" | "recipient";
    original: string;
    translated?: string;
    timestamp: number;
  }>;
  detectedDialect?: string;
  recipeContext?: {
    dishName?: string;
    ingredients: string[];
    steps: string[];
    missingInfo: string[];
  };
}

// POST /api/conversation-translate - Real-time conversation translation & facilitation
export async function POST(request: NextRequest) {
  try {
    const { 
      text, 
      speaker, 
      context,
      action = "translate" // translate | suggest-prompts | detect-dialect
    } = await request.json();

    if (action === "suggest-prompts") {
      return handlePromptSuggestions(context);
    }

    if (action === "detect-dialect") {
      return handleDialectDetection(text);
    }

    // Main translation flow
    if (!text?.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const prompt = `You are an AI conversation facilitator helping capture family recipes. You're translating between:

CONVERSATION CONTEXT:
- Giver: ${context.participants?.giver?.name || "Family member"} (speaks ${context.participants?.giver?.language || "dialect"})
- Recipient: ${context.participants?.recipient?.name || "Recipe learner"} (speaks ${context.participants?.recipient?.language || "English"})
- Topic: ${context.topic || "Family recipe sharing"}
- Detected dialect: ${context.detectedDialect || "Unknown"}

RECENT CONVERSATION:
${context.conversationHistory?.slice(-5).map((msg: any, i: number) => 
  `${msg.speaker}: "${msg.original}"${msg.translated ? ` → "${msg.translated}"` : ""}`
).join('\n') || "No recent context"}

CURRENT RECIPE STATUS:
- Dish: ${context.recipeContext?.dishName || "Not identified"}
- Ingredients mentioned: ${context.recipeContext?.ingredients?.join(", ") || "None yet"}
- Steps mentioned: ${context.recipeContext?.steps?.length || 0} steps
- Missing info: ${context.recipeContext?.missingInfo?.join(", ") || "None identified"}

TASK: The ${speaker} just said: "${text}"

Please provide:
1. TRANSLATION: Translate to ${speaker === "giver" ? context.participants?.recipient?.language || "English" : context.participants?.giver?.language || "the dialect"}
2. INTERPRETATION: What cooking information was shared (ingredients, techniques, quantities, etc.)
3. SUGGESTIONS: What the ${speaker === "giver" ? "recipient" : "giver"} could ask next to get more recipe details
4. CONTEXT_UPDATE: Updated recipe information from this message

Respond in JSON format:
{
  "translation": "translated text",
  "interpretation": {
    "ingredientsFound": ["ingredient1", "ingredient2"],
    "techniquesFound": ["technique1"],
    "quantitiesFound": [{"ingredient": "name", "amount": "amount", "confidence": "low/medium/high"}],
    "timingFound": ["time reference"],
    "equipmentFound": ["equipment"]
  },
  "suggestions": {
    "clarifyingQuestions": ["specific question 1", "specific question 2"],
    "conversationFlow": ["general prompt 1", "general prompt 2"]
  },
  "contextUpdate": {
    "dishName": "detected dish name or null",
    "newIngredients": ["new ingredients to add"],
    "newSteps": ["new cooking steps"],
    "missingInfo": ["what's still needed"]
  },
  "dialectConfidence": "low/medium/high"
}

IMPORTANT:
- Be culturally sensitive to Southeast Asian cooking traditions
- Recognize dialect words for common ingredients and techniques
- Don't guess quantities - mark as missing if unclear
- Provide specific, actionable suggestions
- Help maintain conversation flow naturally`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Extract JSON from response
    const jsonStart = content.text.indexOf("{");
    const jsonEnd = content.text.lastIndexOf("}") + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error("No JSON found in response");
    }

    const jsonString = content.text.slice(jsonStart, jsonEnd);
    const result = JSON.parse(jsonString);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in conversation translation:", error);
    return NextResponse.json(
      { error: "Failed to process conversation. Please try again." },
      { status: 500 }
    );
  }
}

async function handlePromptSuggestions(context: ConversationContext) {
  const prompt = `Based on this family recipe conversation context, suggest things the recipient can say to avoid awkward silence:

CONTEXT:
- Last few exchanges: ${context.conversationHistory?.slice(-3).map(msg => `${msg.speaker}: ${msg.original}`).join("; ") || "Just started"}
- Current recipe: ${context.recipeContext?.dishName || "Unknown dish"}
- Missing info: ${context.recipeContext?.missingInfo?.join(", ") || "Unknown"}

Provide 4 suggestions in order of priority:
1. A specific clarifying question about the recipe
2. A general encouragement to continue
3. A cultural/family context question
4. A fallback conversation starter

Format as JSON:
{
  "prompts": [
    {"type": "clarifying", "text": "specific recipe question"},
    {"type": "encouraging", "text": "keep going prompt"},
    {"type": "cultural", "text": "family context question"},
    {"type": "fallback", "text": "general conversation starter"}
  ]
}`;

  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 500,
    temperature: 0.6,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type === "text") {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    }
  }

  // Fallback prompts
  return NextResponse.json({
    prompts: [
      { type: "clarifying", text: "How much of that ingredient do you usually use?" },
      { type: "encouraging", text: "That sounds interesting, please tell me more..." },
      { type: "cultural", text: "Where did you learn to make this dish?" },
      { type: "fallback", text: "What comes next in the recipe?" }
    ]
  });
}

async function handleDialectDetection(text: string) {
  const prompt = `Analyze this text and detect the dialect/language being used:

TEXT: "${text}"

Common Southeast Asian dialects to look for:
- Hokkien/Fujian
- Teochew/Chaozhou
- Cantonese
- Hakka
- Bahasa Malaysia/Indonesia
- Singlish (Singapore English)
- Tamil
- Hindi

Return JSON:
{
  "detectedLanguage": "primary language",
  "dialect": "specific dialect if identifiable",
  "confidence": "low/medium/high",
  "culturalMarkers": ["cultural indicators found"],
  "cookingTerms": ["cooking-specific terms identified"]
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 300,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type === "text") {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return NextResponse.json(JSON.parse(jsonMatch[0]));
      }
    }
  } catch (error) {
    console.error("Dialect detection error:", error);
  }

  return NextResponse.json({
    detectedLanguage: "Unknown",
    dialect: "Unknown",
    confidence: "low",
    culturalMarkers: [],
    cookingTerms: []
  });
}