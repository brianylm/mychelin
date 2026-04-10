import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// POST /api/capture/transcribe-chunk
//
// Accepts a base64-encoded audio chunk plus participant names and language,
// sends it to Gemini 1.5 Flash for transcription + speaker diarization,
// and returns a list of segments:
//
//   { segments: [ { speaker: "Ah Ma", text: "..." }, ... ] }
//
// We pick Gemini (instead of a streaming STT like Deepgram) because the
// project targets Chinese heritage dialects — Hokkien, Cantonese, and
// Mandarin — which mainstream streaming STT services barely support.
// Gemini's multimodal model handles these dialects natively. Chunks are
// typically 4-5s of opus audio, so each call is small and fast.
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
      language?: string; // "zh-yue" | "zh-cn" | "nan" (Hokkien) | "auto"
      participants?: string[]; // e.g. ["Me", "Ah Ma"]
    };

    const audioBase64 = body.audioBase64;
    const mimeType = body.mimeType || "audio/webm";
    const languageCode = body.language || "auto";
    const participants = Array.isArray(body.participants)
      ? body.participants.filter((p) => typeof p === "string" && p.trim())
      : [];

    if (!audioBase64) {
      return NextResponse.json(
        { error: "audioBase64 is required" },
        { status: 400 }
      );
    }

    // Friendly label for the prompt (Gemini doesn't need ISO codes).
    const languageLabel = (() => {
      switch (languageCode) {
        case "zh-yue":
        case "yue":
        case "zh-HK":
          return "Cantonese (粵語)";
        case "nan":
        case "hokkien":
          return "Hokkien (閩南語)";
        case "zh-cn":
        case "zh":
        case "cmn":
          return "Mandarin Chinese (普通話)";
        case "en":
        case "en-US":
          return "English";
        case "ms":
          return "Bahasa Melayu";
        case "ta":
          return "Tamil";
        default:
          return "the language the speakers are using (likely Chinese, English, or a Chinese dialect such as Cantonese or Hokkien)";
      }
    })();

    const participantLine =
      participants.length >= 2
        ? `The two participants are named "${participants[0]}" and "${participants[1]}". Use these exact names as the speaker labels.`
        : `There are up to two speakers. If you can distinguish them, label them "Speaker 1" and "Speaker 2".`;

    const prompt = `You are transcribing a short chunk of a live conversation about a family heritage recipe.

The spoken language is ${languageLabel}. Transcribe faithfully in the script the speakers use (Chinese characters for Chinese dialects, Latin script for English, etc.) and preserve dialect-specific vocabulary. Do not translate.

${participantLine}

If the same speaker talks the entire chunk, return one segment. If the speakers take turns within this chunk, return multiple segments in spoken order. If the audio is silence or unintelligible, return an empty segments array.

Return STRICT JSON only, no prose, no markdown fences, matching this shape:
{
  "segments": [
    { "speaker": "<name>", "text": "<what they said>" }
  ]
}`;

    // Gemini 1.5 Flash — fast, multimodal, cheap. Audio is sent inline as
    // base64 in the `inline_data` part. The same API key is reused from
    // the existing /api/capture/extract route.
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

    // Gemini returns strict JSON because we requested responseMimeType,
    // but defensively strip any stray code fences.
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    let parsed: { segments?: Array<{ speaker?: string; text?: string }> };
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse Gemini transcribe JSON:", cleaned);
      return NextResponse.json({ segments: [] });
    }

    const segments = Array.isArray(parsed.segments)
      ? parsed.segments
          .filter((s) => s && typeof s.text === "string" && s.text.trim())
          .map((s) => ({
            speaker: (s.speaker ?? "").toString().trim() || "Speaker",
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
