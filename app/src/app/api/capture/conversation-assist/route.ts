import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { callDeepSeekJson, isDeepSeekConfigured } from "@/lib/deepseek";
import { requestPath, trackUsageEvent } from "@/lib/usage-events";

export const runtime = "edge";
export const preferredRegion = "hnd1";

interface ConversationAssistMessage {
  speaker?: string;
  text?: string;
  timestamp?: string;
}

interface ConversationAssistResponse {
  translatedGist: string;
  suggestedQuestions: string[];
  missingCues: string[];
  uncertainTerms: string[];
}

function cleanStringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeAssist(data: unknown): ConversationAssistResponse {
  const record = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  return {
    translatedGist:
      typeof record.translatedGist === "string"
        ? record.translatedGist.trim().slice(0, 420)
        : "",
    suggestedQuestions: cleanStringArray(record.suggestedQuestions, 4),
    missingCues: cleanStringArray(record.missingCues, 4),
    uncertainTerms: cleanStringArray(record.uncertainTerms, 4),
  };
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

async function callGeminiAssist(apiKey: string, prompt: string): Promise<{ text: string; model: string }> {
  const model = "gemini-2.5-flash";
  const geminiRes = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!geminiRes.ok) {
    const text = await geminiRes.text();
    throw new Error("Gemini failed: " + geminiRes.status + " " + text.slice(0, 240));
  }

  const geminiData = await geminiRes.json();
  const generatedText: string | undefined =
    geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!generatedText) throw new Error("Gemini returned no text");
  return { text: generatedText, model };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      messages?: ConversationAssistMessage[];
    };
    const messages = Array.isArray(body.messages)
      ? body.messages
          .map((message) => ({
            speaker: String(message.speaker || "Speaker").slice(0, 40),
            text: String(message.text || "").trim().slice(0, 900),
            timestamp: message.timestamp,
          }))
          .filter((message) => message.text)
          .slice(-14)
      : [];

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "messages are required" },
        { status: 400 }
      );
    }

    const transcript = messages
      .map((message) => `${message.speaker}: ${message.text}`)
      .join("\n");

    const prompt = `You are Mychelin's live recipe conversation facilitator.

The user is likely sitting with an older family cook who is narrating a home recipe in mixed English, Mandarin, Cantonese, Hokkien, Teochew, Malay, Tamil, or family-specific vocabulary.

Your job is to help the learner stay in the conversation without interrupting the family cook.

Recent transcript:
${transcript}

Return STRICT JSON only:
{
  "translatedGist": "One short English gist of what was just said. Preserve dish names and family terms when unsure.",
  "suggestedQuestions": [
    "One respectful question the learner can ask now"
  ],
  "missingCues": [
    "Concrete recipe detail that still seems missing"
  ],
  "uncertainTerms": [
    "Original term or phrase that may need family confirmation"
  ]
}

Rules:
- Do not invent quantities, timings, or ingredients.
- Suggested questions must be short enough to read aloud naturally.
- Prioritize questions about quantity, timing, heat level, sensory cues, substitutions, and mistakes to avoid.
- If there is not enough evidence, return a useful generic next question instead of pretending certainty.
- Keep translatedGist under 45 words.
- Return at most 4 suggestedQuestions, 4 missingCues, and 4 uncertainTerms.`;

    let generatedText = "";
    let provider = "";
    let model = "";
    let lastError = "";

    if (isDeepSeekConfigured()) {
      try {
        const deepseek = await callDeepSeekJson({
          system: "You are Mychelin's live recipe conversation facilitator. Return strict JSON only, no markdown.",
          prompt,
          temperature: 0.2,
          maxTokens: 1200,
        });
        generatedText = deepseek.text;
        provider = "deepseek";
        model = deepseek.model;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "DeepSeek failed";
        console.error("DeepSeek conversation assist error:", lastError.slice(0, 240));
      }
    }

    if (!generatedText && geminiKey()) {
      try {
        const gemini = await callGeminiAssist(geminiKey(), prompt);
        generatedText = gemini.text;
        provider = "gemini";
        model = gemini.model;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Gemini failed";
        console.error("Gemini conversation assist error:", lastError.slice(0, 240));
      }
    }

    if (!generatedText) {
      return NextResponse.json(
        {
          error: isDeepSeekConfigured() || geminiKey()
            ? "Conversation assistance failed"
            : "Conversation assistance is not configured. Add DEEPSEEK_API_KEY for DeepSeek text reasoning.",
          detail: lastError ? lastError.slice(0, 180) : undefined,
        },
        { status: isDeepSeekConfigured() || geminiKey() ? 502 : 503 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanJson(generatedText));
    } catch {
      console.error("Failed to parse conversation assist JSON:", generatedText);
      return NextResponse.json(
        { error: "Conversation assistance response could not be parsed" },
        { status: 502 }
      );
    }

    const assistance = normalizeAssist(parsed);
    await trackUsageEvent({
      userId: user.id,
      eventName: "conversation_assist_completed",
      source: "conversation",
      properties: {
        provider,
        model,
        messages_count: messages.length,
        questions_count: assistance.suggestedQuestions.length,
        missing_cues_count: assistance.missingCues.length,
        uncertain_terms_count: assistance.uncertainTerms.length,
      },
      path: requestPath(request),
    });

    return NextResponse.json(assistance);
  } catch (error) {
    console.error("POST /api/capture/conversation-assist error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
