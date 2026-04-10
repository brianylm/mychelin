"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@radix-ui/themes";
import { StopIcon, MagicWandIcon } from "@radix-ui/react-icons";
import { SpeakerSetup } from "./SpeakerSetup";
import { ChatBubble } from "./ChatBubble";
import { RecipeReview } from "./RecipeReview";

// Each chat bubble is one Gemini-returned segment: a contiguous utterance
// attributed to a single participant.
interface ConversationMessage {
  id: string;
  speaker: string; // participant display name
  text: string;
  language: string;
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

type CaptureState = "setup" | "recording" | "review";

// How long each audio chunk is before we POST it to Gemini. 4s strikes a
// decent balance between "live" feel and Gemini call overhead. Lower =
// snappier but more API calls; higher = fewer calls but more lag.
const CHUNK_DURATION_MS = 4000;

// Convert a Blob to a base64 string without the data:...;base64, prefix.
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

export function ConversationCapture() {
  const [state, setState] = useState<CaptureState>("setup");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [speakers, setSpeakers] = useState<{ speaker1: string; speaker2: string }>({
    speaker1: "",
    speaker2: "",
  });
  const [selectedLanguage, setSelectedLanguage] = useState("zh-yue");
  const [isRecording, setIsRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [processingChunks, setProcessingChunks] = useState(0);
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mic + recorder state (refs so we don't re-render on each chunk)
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  // Each chunk we post to Gemini needs to be a *self-contained* encoded
  // blob. We can't just slice a running MediaRecorder stream — the
  // resulting bytes wouldn't be a valid container. So the pattern is:
  //   - start a new MediaRecorder every CHUNK_DURATION_MS
  //   - stop it, which fires a dataavailable event with the full blob
  //   - post that blob, then immediately start a fresh recorder
  // recordingActiveRef gates the auto-restart so stopRecording() can
  // break the loop.
  const recordingActiveRef = useRef<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll as new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      hardStopInternal();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, []);

  // POST a finished chunk to the transcribe endpoint. Segments that come
  // back are appended to the chat log in order.
  const uploadChunk = useCallback(
    async (blob: Blob, mimeType: string) => {
      if (blob.size < 500) return; // tiny blobs are almost certainly silence
      setProcessingChunks((n) => n + 1);
      try {
        const audioBase64 = await blobToBase64(blob);
        const res = await fetch("/api/capture/transcribe-chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64,
            mimeType,
            language: selectedLanguage,
            participants: [speakers.speaker1, speakers.speaker2].filter(Boolean),
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
            // Merge consecutive segments from the same speaker so a long
            // turn split across chunks reads as one bubble.
            const last = next[next.length - 1];
            if (last && last.speaker === seg.speaker) {
              next[next.length - 1] = {
                ...last,
                text: `${last.text} ${seg.text}`.trim(),
              };
            } else {
              next.push({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                speaker: seg.speaker,
                text: seg.text,
                language: selectedLanguage,
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
    },
    [selectedLanguage, speakers]
  );

  // Internal hard-stop used by both stopRecording and unmount cleanup.
  // Doesn't depend on any useCallback-tracked value so it's safe to call
  // from cleanup effects.
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

  // Start one short MediaRecorder "window". On stop we post the blob
  // and, if we're still recording, immediately start the next window.
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
      // Fire-and-forget the upload so we can start the next window
      // immediately without waiting on Gemini.
      uploadChunk(blob, mimeType);
      if (recordingActiveRef.current) {
        startChunkRecorder();
      }
    };
    recorder.start();

    // Schedule the stop that ends this chunk.
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

  const handleSetupComplete = (
    speaker1: string,
    speaker2: string,
    language: string
  ) => {
    setSpeakers({ speaker1, speaker2 });
    setSelectedLanguage(language);
    setState("recording");
  };

  const extractRecipe = async () => {
    if (messages.length === 0) return;

    setIsExtracting(true);
    try {
      const response = await fetch("/api/capture/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation: messages.map((m) => ({
            speaker: m.speaker,
            text: m.text,
            language: m.language,
            timestamp: m.timestamp,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to extract recipe");
      }

      const data = await response.json();
      setExtractedRecipe(data.recipe);
      setState("review");
    } catch (error) {
      console.error("Recipe extraction failed:", error);
      setErrorMessage("Failed to extract recipe. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const saveRecipe = async (recipe: ExtractedRecipe) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recipe.title,
          description: recipe.description,
          cuisine: recipe.cuisine,
          yield: recipe.yield,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          story: recipe.story,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save recipe");
      }

      setState("setup");
      setMessages([]);
      setExtractedRecipe(null);
      alert("Recipe saved successfully! 🎉");
    } catch (error) {
      console.error("Save recipe failed:", error);
      setErrorMessage("Failed to save recipe. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const backToChat = () => {
    setState("recording");
    setExtractedRecipe(null);
  };

  if (state === "setup") {
    return <SpeakerSetup onStart={handleSetupComplete} />;
  }

  if (state === "review" && extractedRecipe) {
    return (
      <RecipeReview
        recipe={extractedRecipe}
        onSave={saveRecipe}
        onBack={backToChat}
        isSaving={isSaving}
      />
    );
  }

  // Side assignment: speaker2 (the elder) goes on the right. Anything
  // that doesn't match them (including stray "Speaker 1"/"Speaker 2"
  // labels from Gemini) lands on the left.
  const sideForSpeaker = (name: string): "left" | "right" =>
    name === speakers.speaker2 ? "right" : "left";

  const languageLabel = (() => {
    switch (selectedLanguage) {
      case "zh-yue":
        return "Cantonese";
      case "nan":
        return "Hokkien";
      case "zh-cn":
        return "Mandarin";
      case "en":
        return "English";
      default:
        return "the selected language";
    }
  })();

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm min-w-0">
            <span className="font-medium text-neutral-900 truncate">
              {speakers.speaker1} &amp; {speakers.speaker2}
            </span>
            <div className="text-xs text-neutral-500">
              {messages.length} {messages.length === 1 ? "turn" : "turns"}
              {processingChunks > 0 && " · transcribing…"}
            </div>
          </div>
          <Button
            onClick={extractRecipe}
            disabled={messages.length === 0 || isExtracting || isRecording}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isExtracting ? "Extracting..." : (
              <>
                <MagicWandIcon />
                Extract Recipe
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Chat log */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && !isRecording && !connecting && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-xs">
              <div className="text-4xl mb-4">🎙️</div>
              <p className="text-neutral-600 text-sm">
                Press <strong>Start conversation</strong> below. As you both
                talk, the AI will label each person and stream the transcript
                into the chat every few seconds.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            speaker={message.speaker}
            text={message.text}
            language={message.language}
            timestamp={message.timestamp}
            isRight={sideForSpeaker(message.speaker) === "right"}
          />
        ))}

        {/* Listening indicator while waiting for the next chunk */}
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

      {/* Error banner */}
      {errorMessage && (
        <div className="flex-shrink-0 bg-red-50 border-t border-red-200 px-4 py-2 text-xs text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Start / Stop bar */}
      <div className="flex-shrink-0 bg-white border-t border-neutral-200 px-4 py-4 safe-bottom">
        <div className="flex items-center justify-center gap-4">
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-600 active:scale-95"
            >
              <StopIcon className="h-4 w-4" />
              Stop conversation
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={connecting}
              className="flex items-center gap-2 rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-amber-700 active:scale-95 disabled:opacity-60"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              </span>
              {connecting ? "Connecting…" : "Start conversation"}
            </button>
          )}
          {isRecording && (
            <div className="flex items-center gap-2 text-xs text-red-500">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="font-medium">Live</span>
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-[11px] text-neutral-500">
          The AI listens in {languageLabel} and labels each turn automatically.
        </p>
      </div>
    </div>
  );
}
