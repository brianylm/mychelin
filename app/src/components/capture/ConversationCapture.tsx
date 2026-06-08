"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@radix-ui/themes";
import { StopIcon, MagicWandIcon, Cross2Icon } from "@radix-ui/react-icons";
import { AlertCircle, ClipboardCheck, Languages, MessageCircleQuestion, Mic2 } from "lucide-react";
import { ChatBubble } from "./ChatBubble";

// Modal-based conversation facilitation. Opens from the recipe page,
// records the family recipe conversation with zero pre-setup, streams
// chunks for transcription, and uses the recent transcript to surface a
// translated gist plus respectful follow-up questions while the learner
// is still talking with the family cook.

interface ConversationMessage {
  id: string;
  speakerLabel: string; // raw label from Gemini, e.g. "Speaker 1"
  text: string;
  timestamp: string;
}

interface ConversationAssist {
  translatedGist: string;
  suggestedQuestions: string[];
  missingCues: string[];
  uncertainTerms: string[];
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
    m.includes("openai_api_key") ||
    m.includes("gemini_api_key") ||
    m.includes("google_api_key")
  );
}

function ErrorBanner({ message }: { message: string }) {
  if (isSetupError(message)) {
    return (
      <div className="border-t border-[#800020]/15 bg-[#800020]/5 px-4 py-3 text-xs text-[#241017]">
        <div className="mb-1 flex items-center gap-1.5 font-semibold">
          <span>AI capture needs a transcription key</span>
        </div>
        <p className="leading-relaxed text-[#521224]">
          Add <code className="rounded bg-[#800020]/10 px-1">OPENAI_API_KEY</code>{" "}
          for OpenAI speech-to-text, or keep <code className="rounded bg-[#800020]/10 px-1">GOOGLE_API_KEY</code>{" "}
          for the Gemini fallback, then redeploy.
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

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "";
}

function ConversationAssistPanel({
  assist,
  isLoading,
  error,
  copiedQuestion,
  hasMessages,
  onCopyQuestion,
}: {
  assist: ConversationAssist | null;
  isLoading: boolean;
  error: string | null;
  copiedQuestion: string | null;
  hasMessages: boolean;
  onCopyQuestion: (question: string) => void;
}) {
  const questions = assist?.suggestedQuestions ?? [];
  const missingCues = assist?.missingCues ?? [];
  const uncertainTerms = assist?.uncertainTerms ?? [];

  return (
    <div
      className="sticky top-0 z-10 -mx-4 mb-3 border-b border-[#eadfd0] bg-[#fffaf4]/95 px-4 py-3 shadow-[0_12px_32px_rgba(60,43,25,0.08)] backdrop-blur"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#800020]/10 text-[#800020]">
            <Languages className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#800020]">
              Live helper
            </p>
            <p className="truncate text-xs text-stone-500">
              {isLoading
                ? "Reading the latest turn..."
                : hasMessages
                  ? "Translation gist and questions"
                  : "Start talking to unlock prompts"}
            </p>
          </div>
        </div>
        {copiedQuestion && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#17131f] px-2.5 py-1 text-[10px] font-semibold text-white">
            <ClipboardCheck className="h-3 w-3" aria-hidden="true" />
            Copied
          </span>
        )}
      </div>

      {error && (
        <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!hasMessages && !error && (
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Mychelin will listen for family terms, translate the gist, and suggest
          useful questions while the recipe is being narrated.
        </p>
      )}

      {assist?.translatedGist && (
        <div className="mt-3 rounded-2xl border border-[#eadfd0] bg-white px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
            Gist
          </p>
          <p className="mt-1 text-sm leading-6 text-stone-800">
            {assist.translatedGist}
          </p>
        </div>
      )}

      {questions.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
            <MessageCircleQuestion className="h-3.5 w-3.5" aria-hidden="true" />
            Ask next
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {questions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => onCopyQuestion(question)}
                className="min-w-[12rem] max-w-[18rem] shrink-0 rounded-2xl border border-[#800020]/15 bg-[#800020]/5 px-3 py-2 text-left text-xs leading-5 text-[#241017] transition hover:border-[#800020]/30 hover:bg-[#800020]/10"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {(missingCues.length > 0 || uncertainTerms.length > 0) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {missingCues.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                Still missing
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {missingCues.map((cue) => (
                  <span key={cue} className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-600">
                    {cue}
                  </span>
                ))}
              </div>
            </div>
          )}
          {uncertainTerms.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                Confirm wording
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {uncertainTerms.map((term) => (
                  <span key={term} className="rounded-full bg-[#f7c86a]/25 px-2.5 py-1 text-[11px] text-stone-700">
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
  const [conversationAssist, setConversationAssist] = useState<ConversationAssist | null>(null);
  const [isAssisting, setIsAssisting] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [copiedQuestion, setCopiedQuestion] = useState<string | null>(null);

  // Map from raw Gemini speaker label to the real name the user assigns
  // in the naming step. Defaults below give the user something to edit.
  const [speakerNameMap, setSpeakerNameMap] = useState<Record<string, string>>({});

  // Recorder refs (don't want to re-render on every chunk)
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  const recordingActiveRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const assistRequestSignatureRef = useRef<string>("");

  const transcriptSignature = useMemo(
    () => messages.map((m) => m.speakerLabel + ":" + m.text).join("\n").slice(-5000),
    [messages]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      hardStopInternal();
    };
  }, []);

  useEffect(() => {
    if (step !== "recording" || messages.length === 0 || !transcriptSignature) return;
    if (assistRequestSignatureRef.current === transcriptSignature) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsAssisting(true);
      try {
        const res = await fetch("/api/capture/conversation-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: messages.slice(-14).map((message) => ({
              speaker: message.speakerLabel,
              text: message.text,
              timestamp: message.timestamp,
            })),
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Question helper unavailable");
        }
        const data = (await res.json()) as ConversationAssist;
        assistRequestSignatureRef.current = transcriptSignature;
        setConversationAssist(data);
        setAssistError(null);
      } catch (err: unknown) {
        if (getErrorName(err) === "AbortError") return;
        console.warn("Conversation assist failed:", err);
        setAssistError("Live questions are unavailable, but recording still works.");
      } finally {
        if (!controller.signal.aborted) setIsAssisting(false);
      }
    }, 900);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [messages, step, transcriptSignature]);

  const handleCopyQuestion = useCallback((question: string) => {
    setCopiedQuestion(question);
    void navigator.clipboard?.writeText(question).catch(() => undefined);
    window.setTimeout(() => {
      setCopiedQuestion((current) => (current === question ? null : current));
    }, 1300);
  }, []);

  const uploadChunk = useCallback(async (blob: Blob, mimeType: string) => {
    if (blob.size < 500) return;
    setProcessingChunks((n) => n + 1);
    try {
      const transcribeWithOpenAI = async () => {
        const formData = new FormData();
        const extension = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
        formData.set("audio", new File([blob], `conversation-chunk.${extension}`, { type: mimeType }));
        formData.set("language", "auto");
        const res = await fetch("/api/capture/transcribe-whisper", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "OpenAI transcription failed");
        }
        return (await res.json()) as {
          segments?: Array<{ speaker: string; text: string }>;
        };
      };

      const transcribeWithGemini = async () => {
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
        return (await res.json()) as {
          segments?: Array<{ speaker: string; text: string }>;
        };
      };

      let data: { segments?: Array<{ speaker: string; text: string }> };
      try {
        data = await transcribeWithOpenAI();
      } catch (openAiError) {
        console.warn("OpenAI transcription unavailable, trying Gemini fallback:", openAiError);
        data = await transcribeWithGemini();
      }

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
    } catch (err: unknown) {
      console.error("Chunk upload failed:", err);
      setErrorMessage(getErrorMessage(err, "Transcription failed"));
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
    } catch (err: unknown) {
      console.error("Failed to start recording:", err);
      setErrorMessage(
        getErrorName(err) === "NotAllowedError"
          ? "Microphone permission denied"
          : getErrorMessage(err, "Failed to start recording")
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
    } catch (err: unknown) {
      console.error("Save conversation failed:", err);
      setErrorMessage(getErrorMessage(err, "Failed to save. Please try again."));
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
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#800020]/10 text-[#800020]">
              <Mic2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Recipe conversation
              </h2>
              <p className="text-[11px] text-neutral-500">
                {step === "recording" && isRecording && "Listening, translating gist, and spotting gaps"}
                {step === "recording" && !isRecording && messages.length === 0 && "Start while the recipe is being narrated"}
                {step === "recording" && !isRecording && messages.length > 0 && "Keep talking, or review and save"}
                {step === "naming" && "Confirm who was speaking"}
                {step === "processing" && "Extracting your recipe..."}
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
              <ConversationAssistPanel
                assist={conversationAssist}
                isLoading={isAssisting}
                error={assistError}
                copiedQuestion={copiedQuestion}
                hasMessages={messages.length > 0}
                onCopyQuestion={handleCopyQuestion}
              />

              {messages.length === 0 && !isRecording && !connecting && (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-xs text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#800020]/10 text-[#800020]">
                      <Mic2 className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <p className="text-sm leading-6 text-neutral-600">
                      Start while a parent or grandparent explains the recipe.
                      Mychelin will capture the transcript, translate the gist,
                      and suggest questions you can ask out loud.
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
                  <div className="flex items-center gap-2 rounded-full bg-[#800020]/5 px-3 py-1 text-[11px] text-[#800020]">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#800020]/50" />
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
                    className="flex items-center gap-2 rounded-full bg-[#17131f] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#800020] active:scale-95 disabled:opacity-60"
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
                    className="bg-[#17131f] hover:bg-[#800020] text-white"
                  >
                    <MagicWandIcon />
                    Done
                  </Button>
                )}
              </div>
              <p className="mt-2 text-center text-[11px] text-neutral-500">
                Auto-detects mixed family language and preserves original terms
                for review after the conversation.
              </p>
            </div>
          </>
        )}

        {step === "naming" && (
          <>
            <div className="flex-1 overflow-y-auto bg-neutral-50 px-4 py-4">
              <p className="mb-4 text-sm text-neutral-600">
                Mychelin heard {uniqueSpeakerLabels.length}{" "}
                {uniqueSpeakerLabels.length === 1 ? "speaker" : "speakers"}.
                Confirm the names before saving the recipe.
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
                        className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-[#800020]/45 focus:ring-2 focus:ring-[#800020]/10 focus:bg-white"
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
                className="flex-1 bg-[#17131f] hover:bg-[#800020] text-white"
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
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#800020]/15 border-t-[#800020]" />
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
