import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
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
            "Conversation assistance is not configured. Add GOOGLE_API_KEY or GEMINI_API_KEY.",
        },
        { status: 503 }
      );
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

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
      console.error("Gemini conversation assist error:", geminiRes.status, text);
      return NextResponse.json(
        { error: "Conversation assistance failed" },
        { status: 502 }
      );
    }

    const geminiData = await geminiRes.json();
    const generatedText: string | undefined =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      return NextResponse.json({
        translatedGist: "",
        suggestedQuestions: [],
        missingCues: [],
        uncertainTerms: [],
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(generatedText.replace(/```json\n?|\n?```/g, "").trim());
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
