import { useState } from "react";
import { Button } from "@radix-ui/themes";
import { ArrowRightIcon } from "@radix-ui/react-icons";

interface SpeakerSetupProps {
  onStart: (speaker1: string, speaker2: string, language: string) => void;
}

const LANGUAGES = [
  { code: "auto", name: "Auto Detect" },
  { code: "en-US", name: "English" },
  { code: "zh-CN", name: "中文 (Mandarin)" },
  { code: "zh-HK", name: "粵語 (Cantonese)" },
  { code: "ms-MY", name: "Bahasa Melayu" },
  { code: "ta-IN", name: "தமிழ் (Tamil)" },
];

export function SpeakerSetup({ onStart }: SpeakerSetupProps) {
  const [speaker1, setSpeaker1] = useState("Me");
  const [speaker2, setSpeaker2] = useState("Ah Ma");
  const [language, setLanguage] = useState("auto");

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
          AI Conversation Capture
        </h1>
        <p className="text-neutral-600 text-sm leading-relaxed">
          Record conversations with elders to capture heritage recipes and stories.
          We'll transcribe your chat and extract a structured recipe at the end.
        </p>
      </div>

      <div className="w-full space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            First Person
          </label>
          <input
            type="text"
            value={speaker1}
            onChange={(e) => setSpeaker1(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="e.g., Me"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Second Person
          </label>
          <input
            type="text"
            value={speaker2}
            onChange={(e) => setSpeaker2(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="e.g., Ah Ma, Grandpa, Mom"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Primary Language (Optional)
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={handleStart}
          disabled={!speaker1.trim() || !speaker2.trim()}
          size="3"
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-4 rounded-xl transition-colors"
        >
          Start Recording Session
          <ArrowRightIcon />
        </Button>
      </div>

      <div className="mt-8 text-xs text-neutral-500 text-center leading-relaxed">
        <p>
          🔒 Conversations are processed privately and only saved when you choose to save the recipe.
        </p>
      </div>
    </div>
  );
}