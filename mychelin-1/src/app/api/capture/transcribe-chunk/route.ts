import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// POST /api/capture/transcribe-chunk
//
// Accepts a base64-encoded audio chunk, sends it to Gemini 1.5 Flash for
// transcription + speaker diarization, and returns a list of segments:
//
//   { segments: [ { speaker: "Speaker 1", text: "..." }, ... ] }
//
// Participants are intentionally unknown at this point — the user labels
// them after the recording ends. The default language is "auto" and the
// prompt lets Gemini decide, which is important because this project
// targets Chinese heritage dialects (Hokkien, Cantonese, Mandarin) that
// mainstream streaming STT services don't cover well. Gemini's
// multimodal model handles those dialects natively.
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI transcription is not configured on this deployment" },
        { status: 503 }
      );
    }

    const body = (await request.json()) as {
      audioBase64?: string;
      mimeType?: string;
      language?: string;
    };

    const audioBase64 = body.audioBase64;
    const mimeType = body.mimeType || "audio/webm";
    const languageCode = body.language || "auto";

    if (!audioBase64) {
      return NextResponse.json(
        { error: "audioBase64 is required" },
        { status: 400 }
      );
    }

    // Friendly language hint. For "auto" we ask Gemini to detect,
    // emphasizing the Chinese dialects we care about.
    const languageInstruction = (() => {
      switch (languageCode) {
        case "zh-yue":
        case "yue":
        case "zh-HK":
          return "The speakers are speaking Cantonese (粵語). Transcribe in Traditional Chinese characters.";
        case "nan":
        case "hokkien":
          return "The speakers are speaking Hokkien / Minnan (閩南語). Transcribe in Traditional Chinese characters or romanization as appropriate.";
        case "zh-cn":
        case "zh":
        case "cmn":
          return "The speakers are speaking Mandarin Chinese (普通話). Transcribe in Simplified Chinese characters.";
        case "en":
        case "en-US":
          return "The speakers are speaking English. Transcribe in English.";
        default:
          return "Auto-detect the language. It is most likely a Chinese dialect (Cantonese, Hokkien, or Mandarin) or English. Transcribe in the speakers' native script — Chinese characters for Chinese dialects, Latin script for English. Do NOT translate.";
      }
    })();

    const prompt = `You are transcribing a short chunk of a live conversation about a family heritage recipe.

${languageInstruction}

There may be one or more speakers. Label each distinct voice you hear as "Speaker 1", "Speaker 2", etc. — always using these exact generic labels. Use "Speaker 1" for the first voice you hear in this chunk.

If the same speaker talks the entire chunk, return one segment. If speakers take turns within this chunk, return multiple segments in spoken order. If the audio is silence or unintelligible, return an empty segments array.

Preserve dialect-specific vocabulary and expressions faithfully. Do not translate or standardize.

Return STRICT JSON only, no prose, no markdown fences, matching this shape:
{
  "segments": [
    { "speaker": "Speaker 1", "text": "<what they said>" }
  ]
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: audioBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const body = await geminiRes.text();
      console.error("Gemini transcribe error:", geminiRes.status, body);
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: 502 }
      );
    }

    const data = await geminiRes.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ segments: [] });
    }

    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    let parsed: { segments?: Array<{ speaker?: string; text?: string }> };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Gemini transcribe JSON:", cleaned);
      return NextResponse.json({ segments: [] });
    }

    const segments = Array.isArray(parsed.segments)
      ? parsed.segments
          .filter((s) => s && typeof s.text === "string" && s.text.trim())
          .map((s) => ({
            speaker: (s.speaker ?? "").toString().trim() || "Speaker 1",
            text: s.text!.trim(),
          }))
      : [];

    return NextResponse.json({ segments });
  } catch (error) {
    console.error("POST /api/capture/transcribe-chunk error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
