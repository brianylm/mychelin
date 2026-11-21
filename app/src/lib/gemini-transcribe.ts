// Gemini chunk transcription helpers for live conversation capture.
//
// Kept pure (no fetch) so the route stays thin and the behaviour is
// unit-testable. Three things matter in production:
//
// 1. Language: the default is true auto-detect. An earlier build forced
//    "hokkien", which turned plain English dictation into a few stray
//    Chinese characters.
// 2. Thinking: Gemini 2.5+/3.x models think by default, and thinking
//    tokens count against maxOutputTokens. With a small cap the JSON is
//    cut off mid-string and parses as nothing. Thinking is turned off or
//    set to its minimum here.
// 3. Quota: the API key may be on the free tier, where each model has its
//    own small per-minute / per-day limit. The route walks a model chain
//    and moves to the next model on 429 / 5xx.

export interface TranscriptChunkSegment {
  speaker: string;
  text: string;
}

export const DEFAULT_TRANSCRIBE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
] as const;

// GEMINI_TRANSCRIBE_MODELS="model-a,model-b" overrides the chain.
export function transcribeModelChain(envValue: string | undefined): string[] {
  const fromEnv = (envValue ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : [...DEFAULT_TRANSCRIBE_MODELS];
}

export function languageInstruction(languageCode: string | undefined): string {
  switch ((languageCode ?? "auto").toLowerCase()) {
    case "zh-yue":
    case "yue":
    case "zh-hk":
      return "The speakers are speaking Cantonese (粵語). Transcribe in Traditional Chinese characters. If a speaker switches to English, keep those words in English.";
    case "nan":
    case "hokkien":
      return "The speakers are speaking Hokkien / Minnan (閩南語). Transcribe in Traditional Chinese characters or romanization as appropriate. If a speaker switches to English, keep those words in English.";
    case "zh-cn":
    case "zh":
    case "cmn":
      return "The speakers are speaking Mandarin Chinese (普通話). Transcribe in Simplified Chinese characters. If a speaker switches to English, keep those words in English.";
    case "en":
    case "en-us":
    case "en-sg":
      return "The speakers are speaking English (possibly Singaporean English). Transcribe in English. Keep any non-English food or family words as spoken.";
    default:
      return "Detect the spoken language from the audio itself; do not assume it. Transcribe every word exactly as spoken, in the language actually spoken: English stays English in Latin script; Mandarin uses Simplified Chinese characters; Cantonese, Hokkien or Teochew use Traditional Chinese characters; Malay stays Malay. Speakers may code-switch mid-sentence; keep each word in its own language. Never translate.";
  }
}

export function buildTranscribePrompt(languageCode: string | undefined): string {
  return `You are transcribing a short chunk of a live conversation or a dictated family recipe.

${languageInstruction(languageCode)}

There may be one or more speakers. Label each distinct voice you hear as "Speaker 1", "Speaker 2", etc. — always using these exact generic labels. Use "Speaker 1" for the first voice you hear in this chunk.

If the same speaker talks the entire chunk, return one segment. If speakers take turns within this chunk, return multiple segments in spoken order. If the audio is silence or unintelligible, return an empty segments array. Never output words that were not spoken.

The chunk may start or end mid-word; transcribe the partial words you can hear.

Preserve dialect-specific vocabulary, ingredient names and quantities faithfully. Do not translate or standardize.

Return STRICT JSON only, no prose, no markdown fences, matching this shape:
{
  "segments": [
    { "speaker": "Speaker 1", "text": "<what they said>" }
  ]
}`;
}

// Thinking control differs by model family. 2.5 takes a token budget
// (0 = off); 3.x takes a level, and only some 3.x models accept "minimal".
export function thinkingConfigFor(model: string): Record<string, string | number> {
  if (model.startsWith("gemini-2.5")) return { thinkingBudget: 0 };
  if (/^gemini-3\.5-flash/.test(model) || /flash-lite/.test(model)) {
    return { thinkingLevel: "minimal" };
  }
  return { thinkingLevel: "low" };
}

export function generationConfigFor(model: string) {
  return {
    temperature: 0.1,
    // A 10 s chunk is ~40 words; 2048 leaves headroom for CJK and for any
    // residual thinking tokens.
    maxOutputTokens: 2048,
    responseMimeType: "application/json",
    thinkingConfig: thinkingConfigFor(model),
  };
}

interface GeminiResponseShape {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

// Returns null when the model output is unusable (empty, truncated or not
// JSON) so the caller can try the next model; [] means "spoke nothing".
export function parseGeminiSegments(data: unknown): TranscriptChunkSegment[] | null {
  const candidate = (data as GeminiResponseShape)?.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .map((part) => part?.text ?? "")
    .join("");
  if (!text.trim()) {
    // A clean STOP with no text is legitimate silence.
    return candidate?.finishReason === "STOP" ? [] : null;
  }
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  let parsed: { segments?: Array<{ speaker?: unknown; text?: unknown }> };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed?.segments)) return [];
  return parsed.segments
    .filter((s) => s && typeof s.text === "string" && s.text.trim())
    .map((s) => ({
      speaker: String(s.speaker ?? "").trim() || "Speaker 1",
      text: String(s.text).trim(),
    }));
}

export type ModelAttempt =
  | { kind: "ok"; data: unknown }
  | { kind: "http"; status: number; body: string };

export type TranscribeOutcome =
  | { ok: true; segments: TranscriptChunkSegment[]; model: string }
  | { ok: false; reason: "quota" | "unavailable"; attempts: string[] };

// Statuses where another model may succeed: quota (429), overload or
// outage (5xx), and a retired/unknown model (404) or a model that rejects
// this request shape (400).
function shouldTryNextModel(status: number): boolean {
  return status === 429 || status >= 500 || status === 404 || status === 400;
}

export async function transcribeWithModelChain(
  models: string[],
  callModel: (model: string) => Promise<ModelAttempt>
): Promise<TranscribeOutcome> {
  const attempts: string[] = [];
  let sawQuota = false;
  for (const model of models) {
    const result = await callModel(model);
    if (result.kind === "ok") {
      const segments = parseGeminiSegments(result.data);
      if (segments) return { ok: true, segments, model };
      attempts.push(`${model}: unparseable`);
      continue;
    }
    attempts.push(`${model}: ${result.status}`);
    if (result.status === 429) sawQuota = true;
    if (!shouldTryNextModel(result.status)) break;
  }
  return { ok: false, reason: sawQuota ? "quota" : "unavailable", attempts };
}
