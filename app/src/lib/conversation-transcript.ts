// Canonical transcript helpers for live conversation capture.
//
// During recording, fast captions (OpenAI realtime / browser) drive the
// live view while dialect-strong Gemini chunk segments accumulate in a
// backup ref. At extraction time the backup transcript is canonical —
// mainstream streaming STT mangles Hokkien/Cantonese, Gemini doesn't.

export interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp?: string;
}

// Collapses consecutive same-speaker segments and drops empties,
// preserving order. Mirrors the merge the old inline chunk handler did.
export function mergeTranscriptSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  const merged: TranscriptSegment[] = [];
  for (const segment of segments) {
    const speaker = (segment.speaker || "Speaker 1").trim() || "Speaker 1";
    const text = segment.text.trim();
    if (!text) continue;
    const last = merged[merged.length - 1];
    if (last && last.speaker === speaker) {
      last.text = `${last.text} ${text}`;
      if (segment.timestamp) last.timestamp = segment.timestamp;
    } else {
      merged.push({ speaker, text, timestamp: segment.timestamp });
    }
  }
  return merged;
}

// Picks the canonical transcript: the dialect-strong backup when it has
// content, else the live caption messages (covers sessions where the
// Gemini path was failing).
export function pickCanonicalTranscript(input: {
  backup: TranscriptSegment[];
  live: TranscriptSegment[];
}): TranscriptSegment[] {
  const { backup, live } = input;
  const mergedBackup = mergeTranscriptSegments(backup);
  if (mergedBackup.length > 0) return mergedBackup;
  return mergeTranscriptSegments(live);
}

// Maps speaker labels through the user's name map for the extraction call.
export function nameTranscript(
  segments: TranscriptSegment[],
  speakerNameMap: Record<string, string>
): TranscriptSegment[] {
  return segments.map((segment) => ({
    ...segment,
    speaker: speakerNameMap[segment.speaker]?.trim() || segment.speaker,
  }));
}
