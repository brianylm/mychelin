// AI photo beautification: turns a user-uploaded dish photo into a
// warm painterly illustration matching the landing-hero style, via the
// Gemini image model. Key resolution mirrors ai-extract.ts.

const TIMEOUT_MS = 25_000;

const STYLE_PROMPT = [
  "Repaint this dish photo as a warm painterly oil painting in a soft,",
  "appetizing editorial style: visible brush strokes, warm cream and",
  "peach background, gentle natural light. Keep the dish, tableware,",
  "and arrangement clearly recognizable. No text, no watermark, no people.",
].join(" ");

export class AiImageError extends Error {
  constructor(
    public readonly kind: "not_configured" | "provider" | "timeout" | "no_image",
    message: string
  ) {
    super(message);
  }
}

function geminiKey(): string | null {
  return (
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    null
  );
}

function toBase64(bytes: Uint8Array): string {
  // Edge-safe base64 (no Buffer).
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function callGeminiImage(
  apiKey: string,
  model: string,
  imageBytes: Uint8Array,
  mimeType: string
): Promise<Uint8Array> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: STYLE_PROMPT },
              { inlineData: { mimeType, data: toBase64(imageBytes) } },
            ],
          },
        ],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const err = new AiImageError("provider", `Gemini image failed (${response.status}): ${body.slice(0, 300)}`);
    (err as AiImageError & { status?: number }).status = response.status;
    throw err;
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }> };
    }>;
  };

  for (const part of data.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) return fromBase64(part.inlineData.data);
  }
  throw new AiImageError("no_image", "Gemini returned no image");
}

// Returns the beautified image as PNG bytes. Throws AiImageError.
export async function beautifyFoodPhoto(
  imageBytes: Uint8Array,
  mimeType: string
): Promise<Uint8Array> {
  const apiKey = geminiKey();
  if (!apiKey) {
    throw new AiImageError(
      "not_configured",
      "Image beautification needs a GOOGLE_API_KEY environment variable."
    );
  }

  let lastError: unknown = null;
  for (const model of ["gemini-2.5-flash-image", "gemini-2.0-flash-preview-image-generation"]) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callGeminiImage(apiKey, model, imageBytes, mimeType);
      } catch (err) {
        lastError = err;
        if (err instanceof AiImageError && err.kind === "no_image") break;
        const status = (err as { status?: number } | null)?.status ?? 0;
        const retryable = status === 429 || status >= 500 || status === 0;
        if (!retryable) break;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
      }
    }
  }

  if (lastError instanceof AiImageError) throw lastError;
  const message = lastError instanceof Error && lastError.name === "TimeoutError"
    ? "Image generation timed out"
    : "Image generation failed";
  throw new AiImageError(
    lastError instanceof Error && lastError.name === "TimeoutError" ? "timeout" : "provider",
    message
  );
}
