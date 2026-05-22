"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@radix-ui/themes";
import { StopIcon, MagicWandIcon, Cross2Icon } from "@radix-ui/react-icons";
import { ChatBubble } from "./ChatBubble";

// Modal-based conversational capture. Opens from the recipe page, records
// the full conversation with zero pre-setup (no speaker names, no language
// picker), streams chunks to Gemini for live transcription + diarization,
// and on save lets the user assign real names to the speaker labels
// Gemini produced. The final recipe data PATCHes back into the recipe
// the modal was opened from.

interface ConversationMessage {
  id: string;
  speakerLabel: string; // raw label from Gemini, e.g. "Speaker 1"
  text: string;
  timestamp: string;
}

interface ExtractedRecipe {
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    notes?: string;
  }>;
  instructions: Array<{
    stepNumber: number;
    content: string;
    tip?: string;
  }>;
  yield?: string;
  prepTime?: string;
  cookTime?: string;
  cuisine?: string;
  origin?: string;
  dialect?: string;
  occasion?: string;
  familyMember?: string;
  story?: string;
}

interface ConversationCaptureProps {
  recipeId: number;
  onClose: () => void;
  // Called after the recipe is PATCHed so the parent can refresh.
  onRecipeUpdated?: () => void;
}

type ModalStep = "recording" | "naming" | "processing";

const CHUNK_DURATION_MS = 4000;

// Detect the "not configured" error from the transcribe / extract routes
// so we can show a richer banner with setup steps instead of a tiny red
// error line.
function isSetupError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("not configured") ||
    m.includes("gemini_api_key") ||
    m.includes("google_api_key")
  );
}

function ErrorBanner({ message }: { message: string }) {
  if (isSetupError(message)) {
    return (
      <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <div className="mb-1 flex items-center gap-1.5 font-semibold">
          <span>⚙️</span>
          <span>AI capture needs a Gemini API key</span>
        </div>
        <p className="leading-relaxed text-amber-800">
          Add a <code className="rounded bg-amber-100 px-1">GOOGLE_API_KEY</code>{" "}
          environment variable in Vercel → Project Settings → Environment
          Variables, then redeploy. Get a free key at{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            aistudio.google.com/apikey
          </a>
          .
        </p>
      </div>
    );
  }
  return (
    <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
      {message}
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function ConversationCapture({
  recipeId,
  onClose,
  onRecipeUpdated,
}: ConversationCaptureProps) {
  const [step, setStep] = useState<ModalStep>("recording");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [processingChunks, setProcessingChunks] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Map from raw Gemini speaker label to the real name the user assigns
  // in the naming step. Defaults below give the user something to edit.
  const [speakerNameMap, setSpeakerNameMap] = useState<Record<string, string>>({});

  // Recorder refs (don't want to re-render on every chunk)
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  const recordingActiveRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      hardStopInternal();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, []);

  const uploadChunk = useCallback(async (blob: Blob, mimeType: string) => {
    if (blob.size < 500) return;
    setProcessingChunks((n) => n + 1);
    try {
      const audioBase64 = await blobToBase64(blob);
      const res = await fetch("/api/capture/transcribe-chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          language: "auto",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Transcription failed");
      }
      const data = (await res.json()) as {
        segments?: Array<{ speaker: string; text: string }>;
      };
      const segments = data.segments ?? [];
      if (segments.length === 0) return;

      setMessages((prev) => {
        const next = [...prev];
        for (const seg of segments) {
          const label = (seg.speaker || "Speaker 1").trim();
          const last = next[next.length - 1];
          // Merge consecutive segments with the same raw label so long
          // turns that span chunks read as one bubble.
          if (last && last.speakerLabel === label) {
            next[next.length - 1] = {
              ...last,
              text: `${last.text} ${seg.text}`.trim(),
            };
          } else {
            next.push({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              speakerLabel: label,
              text: seg.text,
              timestamp: new Date().toISOString(),
            });
          }
        }
        return next;
      });
    } catch (err: any) {
      console.error("Chunk upload failed:", err);
      setErrorMessage(err?.message || "Transcription failed");
    } finally {
      setProcessingChunks((n) => Math.max(0, n - 1));
    }
  }, []);

  const hardStopInternal = () => {
    recordingActiveRef.current = false;
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  };

  const startChunkRecorder = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (!stream) return;
    const mimeType = mimeTypeRef.current;
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      uploadChunk(blob, mimeType);
      if (recordingActiveRef.current) {
        startChunkRecorder();
      }
    };
    recorder.start();
    setTimeout(() => {
      if (recorder.state === "recording") {
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
    }, CHUNK_DURATION_MS);
  }, [uploadChunk]);

  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      mediaStreamRef.current = stream;

      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/mp4",
      ];
      const mimeType = candidates.find(
        (c) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)
      );
      if (!mimeType) {
        throw new Error("Your browser doesn't support audio recording");
      }
      mimeTypeRef.current = mimeType;

      recordingActiveRef.current = true;
      setIsRecording(true);
      setConnecting(false);
      startChunkRecorder();
    } catch (err: any) {
      console.error("Failed to start recording:", err);
      setErrorMessage(
        err?.name === "NotAllowedError"
          ? "Microphone permission denied"
          : err?.message || "Failed to start recording"
      );
      setConnecting(false);
      hardStopInternal();
    }
  }, [startChunkRecorder]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    hardStopInternal();
  }, []);

  // Unique speaker labels that appeared during the conversation, in the
  // order they first spoke. Used in the naming step.
  const uniqueSpeakerLabels = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const m of messages) {
      if (!seen.has(m.speakerLabel)) {
        seen.add(m.speakerLabel);
        order.push(m.speakerLabel);
      }
    }
    return order;
  }, [messages]);

  // When moving to the naming step, seed the map with sensible defaults
  // so the user only has to adjust.
  const goToNaming = () => {
    if (isRecording) stopRecording();
    const seeded: Record<string, string> = {};
    const defaults = ["Me", "Ah Ma"];
    uniqueSpeakerLabels.forEach((label, i) => {
      seeded[label] = speakerNameMap[label] || defaults[i] || label;
    });
    setSpeakerNameMap(seeded);
    setStep("naming");
  };

  // Replace raw labels in messages with user-provided names and send
  // the conversation to the extract endpoint, then PATCH the target
  // recipe with the extracted fields.
  const saveConversation = async () => {
    setStep("processing");
    setErrorMessage(null);
    try {
      const named = messages.map((m) => ({
        speaker: speakerNameMap[m.speakerLabel]?.trim() || m.speakerLabel,
        text: m.text,
        language: "auto",
        timestamp: m.timestamp,
      }));

      const extractRes = await fetch("/api/capture/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: named }),
      });
      if (!extractRes.ok) {
        throw new Error("Failed to extract recipe from conversation");
      }
      const extractData = (await extractRes.json()) as { recipe: ExtractedRecipe };
      const recipe = extractData.recipe;

      // PATCH the existing recipe with the extracted data.
      const patchRes = await fetch(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recipe.title || undefined,
          description: recipe.description || undefined,
          cuisine: recipe.cuisine || undefined,
          yield: recipe.yield || undefined,
          prepTime: recipe.prepTime ? Number(recipe.prepTime) || undefined : undefined,
          cookTime: recipe.cookTime ? Number(recipe.cookTime) || undefined : undefined,
          story: recipe.story || undefined,
          origin: recipe.origin || undefined,
          dialect: recipe.dialect || undefined,
          occasion: recipe.occasion || undefined,
          familyMember: recipe.familyMember || undefined,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
        }),
      });
      if (!patchRes.ok) {
        throw new Error("Failed to update recipe");
      }

      onRecipeUpdated?.();
      onClose();
    } catch (err: any) {
      console.error("Save conversation failed:", err);
      setErrorMessage(err?.message || "Failed to save. Please try again.");
      setStep("naming");
    }
  };

  const handleClose = () => {
    hardStopInternal();
    onClose();
  };

  // Side assignment for the live chat log. For the recording step,
  // we use first-seen order (first speaker = left, second = right).
  const sideForLabel = (label: string): "left" | "right" => {
    const idx = uniqueSpeakerLabels.indexOf(label);
    return idx === 1 ? "right" : "left";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={handleClose}
    >
      <div
        className="flex h-full w-full flex-col bg-white sm:h-[90vh] sm:max-h-[720px] sm:max-w-lg sm:rounded-2xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎙️</span>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Heritage capture
              </h2>
              <p className="text-[11px] text-neutral-500">
                {step === "recording" && isRecording && "Recording — speak naturally"}
                {step === "recording" && !isRecording && messages.length === 0 && "Press start to begin"}
                {step === "recording" && !isRecording && messages.length > 0 && "Press start to keep talking, or Done to save"}
                {step === "naming" && "Who was speaking?"}
                {step === "processing" && "Extracting your recipe…"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <Cross2Icon className="h-4 w-4" />
          </button>
        </div>

        {step === "recording" && (
          <>
            {/* Chat log */}
            <div className="flex-1 overflow-y-auto bg-neutral-50 px-4 py-4 space-y-2">
              {messages.length === 0 && !isRecording && !connecting && (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-xs text-center">
                    <div className="mb-4 text-4xl">🗣️</div>
                    <p className="text-sm text-neutral-600">
                      Press <strong>Start conversation</strong> and the AI will
                      listen to whoever is speaking. Each person gets their own
                      side of the chat. You&apos;ll label them at the end.
                    </p>
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <ChatBubble
                  key={m.id}
                  speaker={m.speakerLabel}
                  text={m.text}
                  language="auto"
                  timestamp={m.timestamp}
                  isRight={sideForLabel(m.speakerLabel) === "right"}
                />
              ))}

              {isRecording && processingChunks > 0 && (
                <div className="flex justify-center py-2">
                  <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] text-amber-700">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                    </span>
                    Transcribing the last few seconds…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {errorMessage && <ErrorBanner message={errorMessage} />}

            {/* Controls */}
            <div className="border-t border-neutral-200 bg-white px-4 py-4">
              <div className="flex items-center justify-center gap-3">
                {isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-600 active:scale-95"
                  >
                    <StopIcon className="h-4 w-4" />
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    disabled={connecting}
                    className="flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-amber-700 active:scale-95 disabled:opacity-60"
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                    </span>
                    {connecting
                      ? "Connecting…"
                      : messages.length > 0
                      ? "Keep talking"
                      : "Start conversation"}
                  </button>
                )}
                {messages.length > 0 && !isRecording && (
                  <Button
                    onClick={goToNaming}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <MagicWandIcon />
                    Done
                  </Button>
                )}
              </div>
              <p className="mt-2 text-center text-[11px] text-neutral-500">
                The AI auto-detects the language — including Cantonese, Hokkien,
                Mandarin, and English.
              </p>
            </div>
          </>
        )}

        {step === "naming" && (
          <>
            <div className="flex-1 overflow-y-auto bg-neutral-50 px-4 py-4">
              <p className="mb-4 text-sm text-neutral-600">
                The AI heard {uniqueSpeakerLabels.length}{" "}
                {uniqueSpeakerLabels.length === 1 ? "speaker" : "speakers"}.
                Who were they?
              </p>
              <div className="space-y-3">
                {uniqueSpeakerLabels.map((label, i) => {
                  const side = i === 1 ? "right" : "left";
                  const preview = messages.find((m) => m.speakerLabel === label)?.text ?? "";
                  return (
                    <div
                      key={label}
                      className="rounded-xl border border-neutral-200 bg-white p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                          {label}
                          {side === "right" ? " · right side" : " · left side"}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {messages.filter((m) => m.speakerLabel === label).length}{" "}
                          turns
                        </span>
                      </div>
                      <input
                        type="text"
                        value={speakerNameMap[label] ?? ""}
                        onChange={(e) =>
                          setSpeakerNameMap((prev) => ({
                            ...prev,
                            [label]: e.target.value,
                          }))
                        }
                        placeholder="e.g. Ah Ma, Me, Grandpa"
                        className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white"
                      />
                      {preview && (
                        <p className="mt-2 line-clamp-2 text-xs text-neutral-500 italic">
                          &ldquo;{preview}&rdquo;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {errorMessage && <ErrorBanner message={errorMessage} />}

            <div className="flex items-center gap-2 border-t border-neutral-200 bg-white px-4 py-3">
              <Button variant="soft" color="gray" onClick={() => setStep("recording")}>
                Back
              </Button>
              <Button
                onClick={saveConversation}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                disabled={uniqueSpeakerLabels.some(
                  (l) => !speakerNameMap[l]?.trim()
                )}
              >
                <MagicWandIcon />
                Extract &amp; save recipe
              </Button>
            </div>
          </>
        )}

        {step === "processing" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            <p className="text-center text-sm text-neutral-700">
              Extracting the recipe from your conversation…
            </p>
            <p className="text-center text-xs text-neutral-400">
              This usually takes 5–15 seconds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
