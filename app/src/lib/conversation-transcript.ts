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

// Rough amount of speech in a transcript: Latin-script words plus CJK
// characters (one Chinese character is roughly one spoken syllable).
export function transcriptWeight(segments: TranscriptSegment[]): number {
  let weight = 0;
  for (const segment of segments) {
    const cjk = segment.text.match(/[\u3400-\u9fff\uf900-\ufaff]/g)?.length ?? 0;
    const words = segment.text
      .replace(/[\u3400-\u9fff\uf900-\ufaff]/g, " ")
      .split(/\s+/)
      .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
    weight += cjk + words;
  }
  return weight;
}

// Picks the canonical transcript. The AI (Gemini) backup is preferred: it
// keeps dialect words that browser captions mangle. But when the backup is
// far thinner than the live captions, the AI path was failing (quota,
// outage, dropped chunks) and the captions are the better record. Pass
// only caption-sourced messages as `live`, not AI chunk bubbles.
export const BACKUP_MIN_SHARE_OF_LIVE = 0.5;

export function pickCanonicalTranscript(input: {
  backup: TranscriptSegment[];
  live: TranscriptSegment[];
}): TranscriptSegment[] {
  const mergedBackup = mergeTranscriptSegments(input.backup);
  const mergedLive = mergeTranscriptSegments(input.live);
  if (mergedBackup.length === 0) return mergedLive;
  const liveWeight = transcriptWeight(mergedLive);
  if (liveWeight > 0 && transcriptWeight(mergedBackup) < liveWeight * BACKUP_MIN_SHARE_OF_LIVE) {
    return mergedLive;
  }
  return mergedBackup;
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
