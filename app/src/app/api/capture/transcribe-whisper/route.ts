import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requestPath, trackUsageEvent } from "@/lib/usage-events";

export const runtime = "edge";
export const preferredRegion = "hnd1";

interface OpenAITranscriptionSegment {
  speaker?: unknown;
  speaker_label?: unknown;
  text?: unknown;
  transcript?: unknown;
}

interface OpenAITranscriptionResponse {
  segments?: OpenAITranscriptionSegment[];
  transcription?: { segments?: OpenAITranscriptionSegment[] };
  text?: unknown;
  transcript?: unknown;
}

function normalizeSpeaker(speaker: unknown, index: number): string {
  const raw = typeof speaker === "string" ? speaker.trim() : "";
  if (!raw) return "Speaker " + (index + 1);
  if (/^speaker\s+\d+$/i.test(raw)) return raw.replace(/^speaker/i, "Speaker");
  const match = raw.match(/(\d+)/);
  return match ? "Speaker " + match[1] : raw;
}


function isBenignAudioError(status: number, body: string): boolean {
  const normalized = body.toLowerCase();
  return (
    status === 400 &&
    (normalized.includes("audio") || normalized.includes("file")) &&
    (normalized.includes("too short") ||
      normalized.includes("too small") ||
      normalized.includes("no speech") ||
      normalized.includes("silent") ||
      normalized.includes("decode") ||
      normalized.includes("could not be decoded") ||
      normalized.includes("invalid file format"))
  );
}

function segmentsFromDiarizedJson(data: OpenAITranscriptionResponse): Array<{ speaker: string; text: string }> {
  const rawSegments = Array.isArray(data?.segments)
    ? data.segments
    : Array.isArray(data?.transcription?.segments)
      ? data.transcription.segments
      : [];

  const segments = rawSegments
    .map((segment: OpenAITranscriptionSegment, index: number) => ({
      speaker: normalizeSpeaker(segment?.speaker ?? segment?.speaker_label, index),
      text: String(segment?.text ?? segment?.transcript ?? "").trim(),
    }))
    .filter((segment: { text: string }) => segment.text.length > 0);

  if (segments.length > 0) return segments;

  const text = String(data?.text ?? data?.transcript ?? "").trim();
  return text ? [{ speaker: "Speaker 1", text }] : [];
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI transcription is not configured. Add OPENAI_API_KEY to enable Whisper capture." },
        { status: 503 }
      );
    }

    const body = await request.formData();
    const audio = body.get("audio");
    const language = body.get("language");
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "audio file is required" }, { status: 400 });
    }

    const model = process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe";
    const formData = new FormData();
    formData.set("file", audio, audio.name || "conversation-chunk.webm");
    formData.set("model", model);

    if (model.includes("diarize")) {
      formData.set("response_format", "diarized_json");
      formData.set("chunking_strategy", "auto");
    } else {
      formData.set("response_format", "json");
      formData.set(
        "prompt",
        "This is a Singapore family recipe conversation. Speech may code-switch between English, Mandarin, Hokkien/Minnan, Teochew, Cantonese, Malay, and family cooking terms. Preserve dialect words phonetically when unsure, keep ingredient names as spoken, and do not translate into English."
      );
      if (typeof language === "string" && language && language !== "auto") {
        formData.set("language", language);
      }
    }

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      if (isBenignAudioError(response.status, text)) {
        console.warn("OpenAI transcribe skipped empty/invalid audio chunk:", response.status, text.slice(0, 300));
        return NextResponse.json({ segments: [] });
      }
      console.error("OpenAI transcribe error:", response.status, text);
      return NextResponse.json({ error: "OpenAI transcription failed" }, { status: 502 });
    }

    const data = (await response.json()) as OpenAITranscriptionResponse;
    const segments = segmentsFromDiarizedJson(data);
    await trackUsageEvent({
      userId: user.id,
      eventName: "transcription_completed",
      source: "conversation",
      properties: {
        provider: "openai",
        model,
        segments_count: segments.length,
        audio_size_bucket_kb: Math.ceil(audio.size / 102400) * 100,
      },
      path: requestPath(request),
    });
    return NextResponse.json({ segments });
  } catch (error) {
    console.error("POST /api/capture/transcribe-whisper error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
