"use client";

import { useState, useCallback } from "react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { SaveIndicator } from "@/components/ui/SaveIndicator";

interface StorySectionProps {
  story: string;
  onSave: (story: string) => Promise<void>;
}

export function StorySection({ story, onSave }: StorySectionProps) {
  const [draft, setDraft] = useState(story);
  const [isSaving, setIsSaving] = useState(false);

  const handleBlur = useCallback(async () => {
    if (draft === story) return;
    setIsSaving(true);
    try {
      await onSave(draft);
    } finally {
      setIsSaving(false);
    }
  }, [draft, story, onSave]);

  return (
    <CollapsibleSection
      title="Family Story"
      subtitle="The memories and traditions behind this recipe"
      badge={story ? "✓" : undefined}
      defaultOpen={!!story}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Story & Cultural Context
          </span>
          <SaveIndicator isSaving={isSaving} />
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          placeholder="Share the story behind this recipe — who taught it to you, when it's traditionally made, what it means to your family..."
          rows={5}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
        />
        <p className="text-[10px] text-neutral-400">
          Every recipe tells a story. Capture the memories before they fade.
        </p>
      </div>
    </CollapsibleSection>
  );
}
