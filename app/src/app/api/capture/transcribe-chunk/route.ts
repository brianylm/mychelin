import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  buildTranscribePrompt,
  generationConfigFor,
  transcribeModelChain,
  transcribeWithModelChain,
  type ModelAttempt,
} from "@/lib/gemini-transcribe";

export const runtime = "edge";
export const preferredRegion = "hnd1";

// POST /api/capture/transcribe-chunk
//
// Accepts a base64-encoded audio chunk, sends it to Gemini (a model chain,
// see lib/gemini-transcribe.ts) for transcription + speaker diarization,
// and returns a list of segments:
//
//   { segments: [ { speaker: "Speaker 1", text: "..." }, ... ] }
//
// Participants are intentionally unknown at this point — the user labels
// them after the recording ends. The default language is "auto": Gemini
// detects it per chunk, so English dictation and Chinese heritage dialects
// (Hokkien, Cantonese, Mandarin) both work.
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
            "AI transcription is not configured. Add a GOOGLE_API_KEY (or GEMINI_API_KEY) environment variable in Vercel with a Gemini API key from https://aistudio.google.com/apikey.",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as {
      audioBase64?: string;
      mimeType?: string;
      language?: string;
    };

    const audioBase64 = body.audioBase64;
    // Gemini wants a bare type ("audio/webm"), not "audio/webm;codecs=opus".
    const mimeType = (body.mimeType || "audio/webm").split(";")[0].trim() || "audio/webm";
    const languageCode = body.language || "auto";

    if (!audioBase64) {
      return NextResponse.json(
        { error: "audioBase64 is required" },
        { status: 400 }
      );
    }

    const models = transcribeModelChain(process.env.GEMINI_TRANSCRIBE_MODELS);
    const prompt = buildTranscribePrompt(languageCode);

    const outcome = await transcribeWithModelChain(models, async (model): Promise<ModelAttempt> => {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: audioBase64 } },
                ],
              },
            ],
            generationConfig: generationConfigFor(model),
          }),
        }
      );
      if (!geminiRes.ok) {
        const errorBody = await geminiRes.text();
        console.error("Gemini transcribe error:", model, geminiRes.status, errorBody.slice(0, 400));
        return { kind: "http", status: geminiRes.status, body: errorBody };
      }
      return { kind: "ok", data: await geminiRes.json() };
    });

    if (!outcome.ok) {
      console.error("Gemini transcription failed on every model:", outcome.attempts.join("; "));
      return NextResponse.json(
        {
          error:
            outcome.reason === "quota"
              ? "AI transcription has hit its usage limit for now."
              : "Transcription failed",
          code: outcome.reason,
        },
        { status: outcome.reason === "quota" ? 429 : 502 }
      );
    }

    return NextResponse.json({ segments: outcome.segments, model: outcome.model });
  } catch (error) {
    console.error("POST /api/capture/transcribe-chunk error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
