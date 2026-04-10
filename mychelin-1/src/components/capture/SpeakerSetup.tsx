"use client";

import { useState } from "react";
import { Button } from "@radix-ui/themes";
import { ArrowRightIcon } from "@radix-ui/react-icons";

interface SpeakerSetupProps {
  onStart: (speaker1: string, speaker2: string, language: string) => void;
}

// Language codes we pass to the transcribe endpoint. Cantonese is the
// launch dialect for heritage capture.
const LANGUAGES = [
  {
    code: "zh-yue",
    name: "Cantonese (粵語)",
    tag: "Heritage dialect",
    recommended: true,
  },
  {
    code: "nan",
    name: "Hokkien / Minnan (閩南語)",
    tag: "Heritage dialect",
  },
  {
    code: "zh-cn",
    name: "Mandarin (普通話)",
    tag: "Chinese",
  },
  { code: "en", name: "English" },
  { code: "auto", name: "Auto-detect" },
];

export function SpeakerSetup({ onStart }: SpeakerSetupProps) {
  const [speaker1, setSpeaker1] = useState("Me");
  const [speaker2, setSpeaker2] = useState("Ah Ma");
  const [language, setLanguage] = useState("zh-yue");

  const handleStart = () => {
    if (speaker1.trim() && speaker2.trim()) {
      onStart(speaker1.trim(), speaker2.trim(), language);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <div className="text-4xl mb-4">🎙️✨</div>
        <h1 className="text-2xl font-bold text-amber-900 mb-2">
          Heritage Recipe Capture
        </h1>
        <p className="text-neutral-600 text-sm leading-relaxed">
          Record a conversation with an elder in their own dialect. The AI
          listens, identifies each speaker, and streams a live transcript
          into a chat log — then extracts a structured recipe at the end.
        </p>
      </div>

      <div className="w-full space-y-5">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            You
          </label>
          <input
            type="text"
            value={speaker1}
            onChange={(e) => setSpeaker1(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-neutral-300 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:bg-white"
            placeholder="e.g. Me"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            The elder you&apos;re speaking with
          </label>
          <input
            type="text"
            value={speaker2}
            onChange={(e) => setSpeaker2(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-neutral-300 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:bg-white"
            placeholder="e.g. Ah Ma, Po Po, Mum"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Language or dialect
          </label>
          <div className="space-y-1.5">
            {LANGUAGES.map((lang) => (
              <label
                key={lang.code}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                  language === lang.code
                    ? "border-amber-400 bg-amber-50"
                    : "border-neutral-200 bg-white hover:border-amber-200"
                }`}
              >
                <input
                  type="radio"
                  name="language"
                  value={lang.code}
                  checked={language === lang.code}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="h-4 w-4 accent-amber-600"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-800">
                      {lang.name}
                    </span>
                    {lang.recommended && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        Start here
                      </span>
                    )}
                  </div>
                  {lang.tag && (
                    <div className="text-[11px] text-neutral-400">
                      {lang.tag}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <Button
          onClick={handleStart}
          disabled={!speaker1.trim() || !speaker2.trim()}
          size="3"
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-4 rounded-xl transition-colors"
        >
          Continue
          <ArrowRightIcon />
        </Button>
      </div>

      <div className="mt-8 text-xs text-neutral-500 text-center leading-relaxed">
        <p>
          🔒 Audio is processed chunk-by-chunk and discarded after
          transcription. Only the final recipe is saved to your account.
        </p>
      </div>
    </div>
  );
}
