"use client";

import { useState, useCallback, useEffect } from "react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { SaveIndicator } from "@/components/ui/SaveIndicator";

interface StorySectionProps {
  story: string;
  onSave: (story: string) => Promise<void>;
}

export function StorySection({ story, onSave }: StorySectionProps) {
  const [draft, setDraft] = useState(story);
  const [isSaving, setIsSaving] = useState(false);

  // Sync draft when recipe changes (prop update)
  useEffect(() => {
    setDraft(story);
  }, [story]);

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
      title="Family story"
      subtitle="Memories, provenance, and why this dish matters"
      badge={story ? "✓" : undefined}
      defaultOpen={!!story}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Story
          </span>
          <SaveIndicator isSaving={isSaving} />
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          placeholder="Who taught this recipe, what occasion it belongs to, or what makes it feel like home?"
          rows={5}
          className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-[#800020]/45 focus:ring-2 focus:ring-[#800020]/10 focus:bg-white placeholder:text-neutral-400"
        />
        <p className="text-[10px] text-neutral-400">
          This is for memory and provenance, not the short recipe-card summary.
        </p>
      </div>
    </CollapsibleSection>
  );
}
