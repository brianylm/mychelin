"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@radix-ui/themes";
import { StopIcon, MagicWandIcon, Cross2Icon } from "@radix-ui/react-icons";
import { AlertCircle, ClipboardCheck, Languages, MessageCircleQuestion, Mic2, RadioTower } from "lucide-react";
import { ChatBubble } from "./ChatBubble";
import { RecipeCaptureReview } from "./RecipeCaptureReview";

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
  isPartial?: boolean;
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

type ModalStep = "recording" | "naming" | "processing" | "review";
type TranscriptionMode = "idle" | "realtime" | "browser" | "chunked";

const CHUNK_DURATION_MS = 4500;

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string };
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: {
    readonly length: number;
    [index: number]: BrowserSpeechRecognitionResult;
  };
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitAudioContext?: typeof AudioContext;
  }
}


// Detect the "not configured" error from the transcribe / extract routes
// so we can show a richer banner with setup steps instead of a tiny red
// error line.
function isSetupError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("not configured") ||
    m.includes("openai_api_key") ||
    m.includes("gemini_api_key") ||
    m.includes("google_api_key") ||
    m.includes("deepseek_api_key")
  );
}

function ErrorBanner({ message }: { message: string }) {
  if (isSetupError(message)) {
    return (
      <div className="border-t border-[#800020]/15 bg-[#800020]/5 px-4 py-3 text-xs text-[#241017]">
        <div className="mb-1 flex items-center gap-1.5 font-semibold">
          <span>AI capture needs speech and text keys</span>
        </div>
        <p className="leading-relaxed text-[#521224]">
          Add <code className="rounded bg-[#800020]/10 px-1">OPENAI_API_KEY</code>{" "}
          for speech-to-text and <code className="rounded bg-[#800020]/10 px-1">DEEPSEEK_API_KEY</code>{" "}
          for conversation gist, prompts, and recipe extraction.
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
  transcriptionMode,
}: {
  assist: ConversationAssist | null;
  isLoading: boolean;
  error: string | null;
  copiedQuestion: string | null;
  hasMessages: boolean;
  onCopyQuestion: (question: string) => void;
  transcriptionMode: TranscriptionMode;
}) {
  const questions = assist?.suggestedQuestions ?? [];
  const missingCues = assist?.missingCues ?? [];
  const uncertainTerms = assist?.uncertainTerms ?? [];
  const statusLabel = transcriptionMode === "realtime"
    ? "Realtime captions"
    : transcriptionMode === "browser"
      ? "Browser captions"
      : transcriptionMode === "chunked"
        ? "Backup captions"
        : "Ready";

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
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-stone-600 ring-1 ring-[#eadfd0]">
            <RadioTower className="h-3 w-3 text-[#800020]" aria-hidden="true" />
            {statusLabel}
          </span>
          {copiedQuestion && (
            <span className="flex items-center gap-1 rounded-full bg-[#17131f] px-2.5 py-1 text-[10px] font-semibold text-white">
              <ClipboardCheck className="h-3 w-3" aria-hidden="true" />
              Copied
            </span>
          )}
        </div>
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
  const [transcriptionMode, setTranscriptionMode] = useState<TranscriptionMode>("idle");
  const [inputLevel, setInputLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversationAssist, setConversationAssist] = useState<ConversationAssist | null>(null);
  const [isAssisting, setIsAssisting] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [copiedQuestion, setCopiedQuestion] = useState<string | null>(null);
  const [reviewRecipe, setReviewRecipe] = useState<ExtractedRecipe | null>(null);
  const [reviewTranscript, setReviewTranscript] = useState<Array<{ speaker: string; text: string; timestamp: string }>>([]);

  // Map from raw Gemini speaker label to the real name the user assigns
  // in the naming step. Defaults below give the user something to edit.
  const [speakerNameMap, setSpeakerNameMap] = useState<Record<string, string>>({});

  // Recorder refs (don't want to re-render on every chunk)
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const realtimeCommitIntervalRef = useRef<number | null>(null);
  const browserSpeechRef = useRef<BrowserSpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioLevelRafRef = useRef<number | null>(null);
  const realtimeAttemptRef = useRef(0);
  const chunkBackupActiveRef = useRef(false);
  const lastLiveTranscriptAtRef = useRef(0);
  const mimeTypeRef = useRef<string>("audio/webm");
  const recordingActiveRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const assistRequestSignatureRef = useRef<string>("");
  const transcriptionModeRef = useRef<TranscriptionMode>("idle");
  const lastChunkFailureNoticeAtRef = useRef(0);
  const chunkFailureCountRef = useRef(0);

  const transcriptSignature = useMemo(
    () => messages.map((m) => m.speakerLabel + ":" + m.text).join("\n").slice(-5000),
    [messages]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    transcriptionModeRef.current = transcriptionMode;
  }, [transcriptionMode]);


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

  const appendRealtimeDelta = useCallback((itemId: string, delta: string) => {
    lastLiveTranscriptAtRef.current = Date.now();
    const cleanDelta = delta;
    if (!cleanDelta.trim()) return;
    const messageId = "realtime-" + itemId;
    setMessages((prev) => {
      const existingIndex = prev.findIndex((message) => message.id === messageId);
      if (existingIndex >= 0) {
        const next = [...prev];
        const current = next[existingIndex];
        next[existingIndex] = {
          ...current,
          text: current.text + cleanDelta,
          isPartial: true,
          timestamp: new Date().toISOString(),
        };
        return next;
      }
      return [
        ...prev,
        {
          id: messageId,
          speakerLabel: "Live transcript",
          text: cleanDelta.trimStart(),
          timestamp: new Date().toISOString(),
          isPartial: true,
        },
      ];
    });
  }, []);

  const completeRealtimeTranscript = useCallback((itemId: string, transcript: string) => {
    lastLiveTranscriptAtRef.current = Date.now();
    const text = transcript.trim();
    if (!text) return;
    const messageId = "realtime-" + itemId;
    setMessages((prev) => {
      const existingIndex = prev.findIndex((message) => message.id === messageId);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          text,
          isPartial: false,
          timestamp: new Date().toISOString(),
        };
        return next;
      }
      return [
        ...prev,
        {
          id: messageId,
          speakerLabel: "Live transcript",
          text,
          timestamp: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const updateBrowserInterim = useCallback((text: string) => {
    if (text.trim()) lastLiveTranscriptAtRef.current = Date.now();
    const trimmed = text.trim();
    const messageId = "browser-interim";
    setMessages((prev) => {
      const withoutInterim = prev.filter((message) => message.id !== messageId);
      if (!trimmed) return withoutInterim;
      return [
        ...withoutInterim,
        {
          id: messageId,
          speakerLabel: "Live transcript",
          text: trimmed,
          timestamp: new Date().toISOString(),
          isPartial: true,
        },
      ];
    });
  }, []);

  const appendBrowserFinal = useCallback((text: string) => {
    lastLiveTranscriptAtRef.current = Date.now();
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev.filter((message) => message.id !== "browser-interim"),
      {
        id: "browser-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
        speakerLabel: "Live transcript",
        text: trimmed,
        timestamp: new Date().toISOString(),
      },
    ]);
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
            language: "hokkien",
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
        data = await transcribeWithGemini();
      } catch (geminiError) {
        console.warn("Gemini dialect transcription unavailable, trying OpenAI fallback:", geminiError);
        try {
          data = await transcribeWithOpenAI();
        } catch (openAiError) {
          console.warn("OpenAI transcription fallback unavailable:", openAiError);
          throw new Error("AI transcription is temporarily unavailable");
        }
      }

      chunkFailureCountRef.current = 0;

      const segments = data.segments ?? [];
      if (segments.length === 0) return;

      const recentLiveTranscript = Date.now() - lastLiveTranscriptAtRef.current < CHUNK_DURATION_MS * 3;
      const hasReliableRealtimeStream = transcriptionModeRef.current === "realtime";
      if (hasReliableRealtimeStream && recentLiveTranscript) return;

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
        if (segments.length > 0) lastLiveTranscriptAtRef.current = Date.now();
        return next;
      });
    } catch (err: unknown) {
      console.warn("Chunk transcription failed:", err);
      chunkFailureCountRef.current += 1;
      const now = Date.now();
      if (now - lastChunkFailureNoticeAtRef.current > 20000) {
        lastChunkFailureNoticeAtRef.current = now;
        setAssistError(
          chunkFailureCountRef.current >= 2
            ? "Recording is still running, but AI transcription is currently unavailable. You can stop and save the captured transcript if any text appears."
            : "Recording is still running. Mychelin is retrying AI transcription in the background."
        );
      }
    } finally {
      setProcessingChunks((n) => Math.max(0, n - 1));
    }
  }, []);

  const stopBrowserSpeechInternal = useCallback(() => {
    const recognition = browserSpeechRef.current;
    browserSpeechRef.current = null;
    if (!recognition) return;
    recognition.onend = null;
    recognition.onerror = null;
    recognition.onresult = null;
    try {
      recognition.abort();
    } catch {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const startBrowserSpeechRecognition = useCallback((): boolean => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) return false;

    stopBrowserSpeechInternal();
    const recognition = new Recognition();
    browserSpeechRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language?.toLowerCase().startsWith("en") ? navigator.language : "en-SG";

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = Array.from({ length: result.length }, (_, index) => result[index]?.transcript ?? "").join(" ");
        if (result.isFinal) finalText += " " + transcript;
        else interimText += " " + transcript;
      }
      if (finalText.trim()) appendBrowserFinal(finalText);
      updateBrowserInterim(interimText);
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      setAssistError("Browser live captions had a connection issue. Mychelin can still use backup chunked transcription if you restart.");
    };

    recognition.onend = () => {
      if (!recordingActiveRef.current || browserSpeechRef.current !== recognition) return;
      window.setTimeout(() => {
        try {
          recognition.start();
        } catch {
          /* ignore duplicate starts */
        }
      }, 300);
    };

    try {
      recognition.start();
      return true;
    } catch (error) {
      console.warn("Browser speech recognition unavailable:", error);
      browserSpeechRef.current = null;
      return false;
    }
  }, [appendBrowserFinal, stopBrowserSpeechInternal, updateBrowserInterim]);

  const stopAudioMeter = useCallback(() => {
    if (audioLevelRafRef.current != null) {
      window.cancelAnimationFrame(audioLevelRafRef.current);
      audioLevelRafRef.current = null;
    }
    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext) {
      void audioContext.close().catch(() => undefined);
    }
    setInputLevel(0);
  }, []);

  const startAudioMeter = useCallback((stream: MediaStream) => {
    stopAudioMeter();
    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextConstructor) return;

    try {
      const audioContext = new AudioContextConstructor();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const centered = (sample - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / samples.length);
        setInputLevel(Math.min(1, rms * 8));
        audioLevelRafRef.current = window.requestAnimationFrame(tick);
      };

      tick();
    } catch (error) {
      console.warn("Audio level meter unavailable:", error);
    }
  }, [stopAudioMeter]);

  const stopRealtimeInternal = useCallback(() => {
    if (realtimeCommitIntervalRef.current != null) {
      window.clearInterval(realtimeCommitIntervalRef.current);
      realtimeCommitIntervalRef.current = null;
    }
    try {
      dataChannelRef.current?.close();
    } catch {
      /* ignore */
    }
    dataChannelRef.current = null;
    try {
      peerConnectionRef.current?.close();
    } catch {
      /* ignore */
    }
    peerConnectionRef.current = null;
  }, []);

  const startRealtimeTranscription = useCallback(async (stream: MediaStream): Promise<boolean> => {
    if (typeof RTCPeerConnection === "undefined") return false;

    stopRealtimeInternal();
    const peerConnection = new RTCPeerConnection();
    peerConnectionRef.current = peerConnection;

    for (const track of stream.getAudioTracks()) {
      peerConnection.addTrack(track, stream);
    }

    const dataChannel = peerConnection.createDataChannel("oai-events");
    dataChannelRef.current = dataChannel;

    const commitAudio = () => {
      const channel = dataChannelRef.current;
      if (channel?.readyState !== "open") return;
      try {
        channel.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      } catch {
        /* ignore intermittent empty-buffer commits */
      }
    };

    dataChannel.onopen = () => {
      commitAudio();
      realtimeCommitIntervalRef.current = window.setInterval(commitAudio, 2200);
    };

    dataChannel.onmessage = (message) => {
      try {
        const event = JSON.parse(String(message.data)) as {
          type?: string;
          item_id?: string;
          delta?: string;
          transcript?: string;
          error?: { message?: string };
        };
        const itemId = event.item_id || "turn-" + Date.now();
        if (event.type === "conversation.item.input_audio_transcription.delta" && event.delta) {
          appendRealtimeDelta(itemId, event.delta);
        }
        if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) {
          completeRealtimeTranscript(itemId, event.transcript);
        }
        if (event.type === "error" && event.error?.message) {
          console.warn("Realtime transcription event error:", event.error.message);
        }
      } catch (error) {
        console.warn("Failed to parse realtime transcription event:", error);
      }
    };

    dataChannel.onerror = () => {
      setAssistError("Realtime captions had a connection issue. Keep talking; backup transcription may still run after reconnect.");
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "failed" || peerConnection.connectionState === "disconnected") {
        setAssistError("Realtime captions disconnected. Stop and restart if the transcript stops moving.");
      }
    };

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6000);
      const response = await fetch("/api/capture/realtime-transcription", {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offer.sdp || "",
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Realtime transcription unavailable");
      }
      const answerSdp = await response.text();
      await peerConnection.setRemoteDescription({ type: "answer", sdp: answerSdp });
      return true;
    } catch (error) {
      console.warn("Realtime transcription unavailable, using chunked fallback:", error);
      stopRealtimeInternal();
      return false;
    }
  }, [appendRealtimeDelta, completeRealtimeTranscript, stopRealtimeInternal]);

  const hardStopInternal = useCallback(() => {
    realtimeAttemptRef.current += 1;
    chunkBackupActiveRef.current = false;
    recordingActiveRef.current = false;
    stopAudioMeter();
    stopRealtimeInternal();
    stopBrowserSpeechInternal();
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setTranscriptionMode("idle");
  }, [stopAudioMeter, stopBrowserSpeechInternal, stopRealtimeInternal]);

  useEffect(() => {
    return () => {
      hardStopInternal();
    };
  }, [hardStopInternal]);

  const startChunkRecorder = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (!stream || !chunkBackupActiveRef.current) return;
    const mimeType = mimeTypeRef.current;
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      void uploadChunk(blob, mimeType);
      if (recordingActiveRef.current && chunkBackupActiveRef.current) {
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
    setAssistError(null);
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
      startAudioMeter(stream);

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
      chunkBackupActiveRef.current = true;
      lastLiveTranscriptAtRef.current = 0;
      lastChunkFailureNoticeAtRef.current = 0;
      chunkFailureCountRef.current = 0;
      setIsRecording(true);
      setConnecting(false);
      startChunkRecorder();

      const browserStarted = startBrowserSpeechRecognition();
      if (browserStarted) {
        setTranscriptionMode("browser");
        setAssistError("Recording is live. Browser captions may be rough for dialect; Mychelin is also checking short AI transcript batches.");
      } else {
        setTranscriptionMode("chunked");
        setAssistError("Recording is live. Dialect-aware AI captions will arrive in short batches if speech transcription is available.");
      }

      const attemptId = realtimeAttemptRef.current + 1;
      realtimeAttemptRef.current = attemptId;
      void startRealtimeTranscription(stream).then((realtimeStarted) => {
        if (!recordingActiveRef.current || realtimeAttemptRef.current !== attemptId) return;
        if (realtimeStarted) {
          chunkBackupActiveRef.current = false;
          try {
            mediaRecorderRef.current?.stop();
          } catch {
            /* ignore */
          }
          stopBrowserSpeechInternal();
          setTranscriptionMode("realtime");
          setAssistError(null);
          return;
        }
        if (browserStarted) {
          setTranscriptionMode("browser");
          setAssistError("OpenAI Realtime is unavailable, but recording is active. Browser captions may be rough for dialect; AI transcript batches will keep checking the audio.");
        } else {
          setTranscriptionMode("chunked");
          setAssistError("OpenAI Realtime is unavailable. Recording is active; dialect-aware captions may arrive after each short audio batch.");
        }
      }).catch((error: unknown) => {
        if (!recordingActiveRef.current || realtimeAttemptRef.current !== attemptId) return;
        console.warn("Realtime transcription background start failed:", error);
        setAssistError(
          browserStarted
            ? "OpenAI Realtime is unavailable, but recording is active. Browser captions may be rough for dialect; AI transcript batches will keep checking the audio."
            : "OpenAI Realtime is unavailable. Recording is active; dialect-aware captions may arrive after each short audio batch."
        );
      });
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
  }, [hardStopInternal, startAudioMeter, startBrowserSpeechRecognition, startChunkRecorder, startRealtimeTranscription, stopBrowserSpeechInternal]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    hardStopInternal();
  }, [hardStopInternal]);

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

  const namedConversation = () => messages.map((m) => ({
    speaker: speakerNameMap[m.speakerLabel]?.trim() || m.speakerLabel,
    text: m.text,
    language: "auto",
    timestamp: m.timestamp,
  }));

  const patchRecipe = async (recipe: ExtractedRecipe) => {
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
  };

  // Replace raw labels in messages with user-provided names and send
  // the conversation to the extract endpoint. The user reviews the
  // structured recipe before we PATCH the target recipe.
  const extractConversationForReview = async () => {
    setStep("processing");
    setErrorMessage(null);
    setReviewRecipe(null);
    setReviewTranscript([]);
    try {
      const named = namedConversation();
      const extractRes = await fetch("/api/capture/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: named }),
      });
      if (!extractRes.ok) {
        throw new Error("Failed to extract recipe from conversation");
      }
      const extractData = (await extractRes.json()) as { recipe: ExtractedRecipe };
      if (!extractData.recipe) {
        throw new Error("AI extraction returned an empty recipe object");
      }
      setReviewRecipe(extractData.recipe);
      setReviewTranscript(named.map(({ speaker, text, timestamp }) => ({ speaker, text, timestamp })));
      setStep("review");
    } catch (err: unknown) {
      console.error("Extract conversation failed:", err);
      setErrorMessage(getErrorMessage(err, "Failed to extract. Please try again."));
      setStep("naming");
    }
  };

  const saveReviewedConversation = async () => {
    if (!reviewRecipe) return;
    setStep("processing");
    setErrorMessage(null);
    try {
      await patchRecipe(reviewRecipe);
      onRecipeUpdated?.();
      onClose();
    } catch (err: unknown) {
      console.error("Save conversation failed:", err);
      setErrorMessage(getErrorMessage(err, "Failed to save. Please try again."));
      setStep("review");
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
                {step === "processing" && (reviewRecipe ? "Saving reviewed recipe..." : "Extracting your recipe...")}
                {step === "review" && "Review before saving"}
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
                transcriptionMode={transcriptionMode}
              />

              {connecting && (
                <div className="flex justify-center py-2">
                  <div className="flex items-center gap-2 rounded-full bg-[#800020]/5 px-3 py-1 text-[11px] text-[#800020] ring-1 ring-[#800020]/10">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#800020]/40 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#800020]" />
                    </span>
                    Opening microphone...
                  </div>
                </div>
              )}

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

              {isRecording && (
                <div className="mb-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="font-semibold">Recording now</span>
                    <span>{inputLevel > 0.08 ? "Hearing audio" : "Waiting for speech"}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/80">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-[width] duration-100"
                      style={{ width: Math.max(8, Math.round(inputLevel * 100)) + "%" }}
                    />
                  </div>
                </div>
              )}

              {isRecording && messages.length === 0 && inputLevel > 0.08 && (
                <div className="relative">
                  <ChatBubble
                    speaker="Live transcript"
                    text="Listening for words..."
                    language="live"
                    timestamp={new Date().toISOString()}
                    isRight={false}
                  />
                  <div className="-mt-3 mb-3 flex justify-start pl-2">
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800 ring-1 ring-amber-100">
                      audio detected
                    </span>
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className="relative">
                  <ChatBubble
                    speaker={m.speakerLabel}
                    text={m.text}
                    language={m.isPartial ? "live" : "auto"}
                    timestamp={m.timestamp}
                    isRight={sideForLabel(m.speakerLabel) === "right"}
                  />
                  {m.isPartial && (
                    <div className="-mt-3 mb-3 flex justify-start pl-2">
                      <span className="rounded-full bg-[#800020]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#800020]">
                        updating
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {isRecording && (transcriptionMode === "realtime" || transcriptionMode === "browser") && messages.length === 0 && (
                <div className="flex justify-center py-2">
                  <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] text-emerald-800 ring-1 ring-emerald-100">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    {transcriptionMode === "browser" ? "Browser captions active. Dialect AI batches may add fuller text shortly." : "Realtime stream connected. Speak and watch this area."}
                  </div>
                </div>
              )}

              {isRecording && processingChunks > 0 && (
                <div className="flex justify-center py-2">
                  <div className="flex items-center gap-2 rounded-full bg-[#800020]/5 px-3 py-1 text-[11px] text-[#800020]">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#800020]/50" />
                    </span>
                    Transcribing the last few seconds...
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
                      ? "Opening mic…"
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
                {transcriptionMode === "realtime"
                  ? "Realtime captions stream as the conversation happens; original terms are kept for review."
                  : transcriptionMode === "browser"
                    ? "Browser captions are rough for dialect; Mychelin also checks AI transcript batches while you talk."
                    : transcriptionMode === "chunked"
                      ? "Dialect-aware backup captions arrive every few seconds and preserve original terms for review."
                      : "Auto-detects mixed family language and preserves original terms for review after the conversation."}
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
                onClick={extractConversationForReview}
                className="flex-1 bg-[#17131f] hover:bg-[#800020] text-white"
                disabled={uniqueSpeakerLabels.some(
                  (l) => !speakerNameMap[l]?.trim()
                )}
              >
                <MagicWandIcon />
                Review extracted recipe
              </Button>
            </div>
          </>
        )}

        {step === "review" && reviewRecipe && (
          <RecipeCaptureReview
            recipe={reviewRecipe}
            sourceLabel="Recorded conversation"
            saveLabel="Save reviewed recipe"
            onBack={() => setStep("naming")}
            onSave={saveReviewedConversation}
          >
            <section className="rounded-2xl border border-[#eadfce] bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-stone-900">Transcript used</p>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500">
                  {reviewTranscript.length} turns
                </span>
              </div>
              <div className="space-y-2">
                {reviewTranscript.slice(-8).map((turn, index) => (
                  <div key={index} className="rounded-xl bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600">
                    <span className="font-semibold text-stone-900">{turn.speaker}: </span>
                    {turn.text}
                  </div>
                ))}
              </div>
            </section>
          </RecipeCaptureReview>
        )}

        {step === "processing" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#800020]/15 border-t-[#800020]" />
            <p className="text-center text-sm text-neutral-700">
              {reviewRecipe ? "Saving the reviewed recipe..." : "Extracting the recipe from your conversation..."}
            </p>
            <p className="text-center text-xs text-neutral-400">
              This usually takes 5-15 seconds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
