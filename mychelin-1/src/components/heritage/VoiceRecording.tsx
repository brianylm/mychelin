"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button, IconButton } from "@radix-ui/themes";
import { Cross2Icon, PlayIcon } from "@radix-ui/react-icons";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

interface VoiceRecordingProps {
  recordings: VoiceClip[];
  onSaveRecording: (blob: Blob, duration: number) => Promise<void>;
  onDeleteRecording: (id: string) => void;
}

export interface VoiceClip {
  id: string;
  url: string;
  duration: number;
  label?: string;
  createdAt: string;
}

export function VoiceRecording({
  recordings,
  onSaveRecording,
  onDeleteRecording,
}: VoiceRecordingProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorder.current?.state === "recording") {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: recorder.mimeType });
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);

        if (duration >= 1) {
          await onSaveRecording(blob, duration);
        }
      };

      mediaRecorder.current = recorder;
      recorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      setError(
        "Microphone access denied. Please allow microphone permissions to record."
      );
    }
  }, [onSaveRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const playClip = useCallback(
    (clip: VoiceClip) => {
      if (playingId === clip.id) {
        audioRef.current?.pause();
        setPlayingId(null);
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(clip.url);
      audio.onended = () => setPlayingId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingId(clip.id);
    },
    [playingId]
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <CollapsibleSection
      title="Voice Recordings"
      subtitle="Capture recipes in their original dialect"
      badge={recordings.length || undefined}
      defaultOpen={recordings.length > 0}
    >
      <div className="space-y-3">
        {/* Recording list */}
        {recordings.length > 0 && (
          <ul className="space-y-2">
            {recordings.map((clip) => (
              <li
                key={clip.id}
                className="group flex items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2"
              >
                <IconButton
                  variant="soft"
                  size="2"
                  radius="full"
                  onClick={() => playClip(clip)}
                  className={
                    playingId === clip.id
                      ? "bg-amber-100 text-amber-700"
                      : ""
                  }
                >
                  {playingId === clip.id ? (
                    <span className="text-xs font-bold">⏸</span>
                  ) : (
                    <PlayIcon />
                  )}
                </IconButton>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-800 truncate">
                    {clip.label || "Voice recording"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatTime(clip.duration)} •{" "}
                    {new Date(clip.createdAt).toLocaleDateString("en-SG", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>

                {/* Waveform placeholder */}
                <div className="hidden sm:flex items-center gap-px">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-0.5 rounded-full ${
                        playingId === clip.id
                          ? "bg-amber-400 animate-pulse"
                          : "bg-neutral-300"
                      }`}
                      style={{
                        height: `${8 + Math.sin(i * 0.8) * 8 + Math.random() * 4}px`,
                      }}
                    />
                  ))}
                </div>

                <IconButton
                  variant="ghost"
                  size="1"
                  color="red"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => onDeleteRecording(clip.id)}
                >
                  <Cross2Icon />
                </IconButton>
              </li>
            ))}
          </ul>
        )}

        {/* Record button */}
        {isRecording ? (
          <div className="flex items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="relative flex h-10 w-10 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-40" />
              <span className="relative inline-flex h-6 w-6 rounded-full bg-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Recording...</p>
              <p className="text-xs text-red-600 tabular-nums">
                {formatTime(recordingTime)}
              </p>
            </div>
            <Button
              variant="solid"
              color="red"
              size="2"
              onClick={stopRecording}
            >
              Stop
            </Button>
          </div>
        ) : (
          <Button
            variant="soft"
            size="2"
            className="w-full"
            onClick={startRecording}
          >
            <span className="mr-2">🎙️</span>
            Record voice
          </Button>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        <p className="text-[10px] text-neutral-400">
          Record grandma explaining the recipe in her own words and dialect.
          These recordings are stored locally until you upload.
        </p>
      </div>
    </CollapsibleSection>
  );
}
