import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";
export const preferredRegion = "hnd1";

async function safetyIdentifier(userId: number): Promise<string> {
  const input = new TextEncoder().encode("mychelin-realtime:" + userId);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 64);
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
        { error: "OpenAI Realtime transcription is not configured. Add OPENAI_API_KEY." },
        { status: 503 }
      );
    }

    const sdp = await request.text();
    if (!sdp.trim()) {
      return NextResponse.json({ error: "SDP offer is required" }, { status: 400 });
    }

    const model = process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL || "gpt-realtime-whisper";
    const delay = process.env.OPENAI_REALTIME_TRANSCRIPTION_DELAY || "low";
    const session = {
      type: "transcription",
      audio: {
        input: {
          transcription: {
            model,
            delay,
          },
          noise_reduction: {
            type: "near_field",
          },
          turn_detection: null,
        },
      },
    };

    const formData = new FormData();
    formData.set("sdp", sdp);
    formData.set("session", JSON.stringify(session));

    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "OpenAI-Safety-Identifier": await safetyIdentifier(user.id),
      },
      body: formData,
    });

    const answer = await response.text();
    if (!response.ok) {
      console.error("OpenAI realtime transcription error:", response.status, answer.slice(0, 800));
      return NextResponse.json(
        { error: "Realtime transcription failed to start" },
        { status: 502 }
      );
    }

    return new NextResponse(answer, {
      status: 200,
      headers: {
        "Content-Type": "application/sdp",
      },
    });
  } catch (error) {
    console.error("POST /api/capture/realtime-transcription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
