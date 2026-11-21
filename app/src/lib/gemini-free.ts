// Shared free-tier Gemini text call for every Mychelin text route
// (conversation assist, extraction, draft recipe, book principles).
//
// The key is on Google's free tier, where each model has its own small
// quota (gemini-2.5-flash: 20 requests/day). Calls walk a model chain and
// move on at 429 / 5xx / 404, and thinking is off or minimal so thinking
// tokens cannot eat maxOutputTokens and truncate the JSON.
import { thinkingConfigFor, transcribeModelChain } from "@/lib/gemini-transcribe";

export function geminiApiKey(): string {
  return (
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    ""
  ).trim();
}

// Same chain as transcription; GEMINI_TEXT_MODELS overrides it.
export function geminiTextModelChain(): string[] {
  return transcribeModelChain(process.env.GEMINI_TEXT_MODELS);
}

export interface GeminiTextOptions {
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  json?: boolean;
  models?: string[];
  fetchImpl?: typeof fetch;
}

export type GeminiTextResult =
  | { ok: true; text: string; model: string }
  | { ok: false; status: number; reason: "not_configured" | "quota" | "unavailable"; detail: string };

function retryableStatus(status: number): boolean {
  return status === 429 || status >= 500 || status === 404 || status === 400;
}

export async function generateGeminiText({
  prompt,
  temperature = 0.2,
  maxOutputTokens = 2048,
  json = true,
  models = geminiTextModelChain(),
  fetchImpl = fetch,
}: GeminiTextOptions): Promise<GeminiTextResult> {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    return { ok: false, status: 503, reason: "not_configured", detail: "Gemini key missing" };
  }

  let sawQuota = false;
  let lastStatus = 502;
  let lastDetail = "";
  for (const model of models) {
    const res = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens,
            ...(json ? { responseMimeType: "application/json" } : {}),
            thinkingConfig: thinkingConfigFor(model),
          },
        }),
      }
    );
    if (!res.ok) {
      lastStatus = res.status;
      lastDetail = (await res.text()).slice(0, 300);
      console.error("Gemini " + model + " failed:", res.status, lastDetail.slice(0, 200));
      if (res.status === 429) sawQuota = true;
      if (!retryableStatus(res.status)) break;
      continue;
    }
    const data = (await res.json()) as {
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string; thought?: boolean }> };
      }>;
    };
    const candidate = data?.candidates?.[0];
    // Skip thought-summary parts; only the answer text is JSON.
    const text = (candidate?.content?.parts ?? [])
      .filter((p) => !p?.thought)
      .map((p) => p?.text ?? "")
      .join("");
    if (text.trim() && candidate?.finishReason !== "MAX_TOKENS") {
      return { ok: true, text, model };
    }
    lastStatus = 502;
    lastDetail = `${model} returned ${text.trim() ? "truncated" : "no"} content (${candidate?.finishReason ?? "?"})`;
    console.error("Gemini " + model + ":", lastDetail);
  }
  return {
    ok: false,
    status: sawQuota ? 429 : lastStatus,
    reason: sawQuota ? "quota" : "unavailable",
    detail: lastDetail,
  };
}
