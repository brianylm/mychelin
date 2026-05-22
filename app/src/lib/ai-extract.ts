// Shared extraction helper — tries Gemini first, then falls back to
// MiniMax if Gemini exhausts its retries / hits overload. Both paths
// return the raw JSON string produced by the model.

export interface ExtractResult {
  text: string;
  provider: "gemini" | "minimax";
  model: string;
}

export interface ExtractError {
  message: string;
  status: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Gemini ─────────────────────────────────────────────
async function callGemini(
  apiKey: string,
  model: string,
  prompt: string
): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) {
    return { ok: false, status: res.status, body: await res.text() };
  }

  const data = await res.json();
  // Gemini 2.5 may include a thinking part (with "thought": true) before
  // the actual text part. Pick the last non-thinking text part.
  const parts: Array<{ text?: string; thought?: boolean }> =
    data?.candidates?.[0]?.content?.parts ?? [];
  const responseParts = parts.filter(
    (p) => typeof p.text === "string" && !p.thought
  );
  const text = responseParts.length > 0
    ? responseParts[responseParts.length - 1].text
    : parts.find((p) => typeof p.text === "string")?.text;
  if (!text) {
    return { ok: false, status: 502, body: "Gemini returned no text part" };
  }
  return { ok: true, text };
}

// ─── MiniMax (OpenAI-compatible chat completions) ──────
async function callMiniMax(
  apiKey: string,
  model: string,
  baseUrl: string,
  prompt: string
): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const res = await fetch(`${baseUrl}/v1/text/chatcompletion_v2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a recipe extraction assistant. Return only valid JSON matching the schema in the user message. No prose, no markdown fences.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    return { ok: false, status: res.status, body: await res.text() };
  }

  const data = await res.json();
  // MiniMax uses OpenAI-compatible shape: choices[0].message.content
  // but also check output.choices and other known shapes
  const text: string | undefined =
    data?.choices?.[0]?.message?.content ||
    data?.output?.choices?.[0]?.message?.content ||
    data?.reply;
  if (!text) {
    console.error("MiniMax unexpected response shape:", JSON.stringify(data).slice(0, 500));
    return { ok: false, status: 502, body: `MiniMax returned no content. Keys: ${Object.keys(data || {}).join(",")}` };
  }
  return { ok: true, text };
}

// ─── Main dispatcher ────────────────────────────────────
export async function extractRecipeText(
  prompt: string
): Promise<{ ok: true; result: ExtractResult } | { ok: false; error: ExtractError }> {
  const geminiKey =
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GEMINI_API_KEY;
  const minimaxKey = process.env.MINIMAX_API_KEY;
  const minimaxModel = process.env.MINIMAX_MODEL || "MiniMax-Text-01";
  const minimaxBase =
    process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com";

  let lastStatus = 0;
  let lastBody = "";

  // Try Gemini models — 2.0-flash first (most stable), then 2.5-flash
  // (smarter but more often overloaded). One retry each on transient errors.
  if (geminiKey) {
    for (const model of ["gemini-2.0-flash", "gemini-2.5-flash"]) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await callGemini(geminiKey, model, prompt);
        if (r.ok) {
          return {
            ok: true,
            result: { text: r.text, provider: "gemini", model },
          };
        }
        lastStatus = r.status;
        lastBody = r.body;
        console.error(`Gemini ${model} attempt ${attempt + 1} failed:`, r.status, r.body.slice(0, 200));
        const isTransient = r.status === 429 || r.status >= 500;
        if (!isTransient) break;
        if (attempt === 0) await sleep(600);
      }
    }
  }

  // Gemini exhausted (or no key) — try MiniMax if configured.
  if (minimaxKey) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await callMiniMax(minimaxKey, minimaxModel, minimaxBase, prompt);
      if (r.ok) {
        return {
          ok: true,
          result: { text: r.text, provider: "minimax", model: minimaxModel },
        };
      }
      lastStatus = r.status;
      lastBody = r.body;
      console.error(`MiniMax attempt ${attempt + 1} failed:`, r.status, r.body.slice(0, 200));
      const isTransient = r.status === 429 || r.status >= 500;
      if (!isTransient) break;
      if (attempt === 0) await sleep(600);
    }
  }

  // Everything exhausted — surface the last upstream error.
  if (!geminiKey && !minimaxKey) {
    return {
      ok: false,
      error: {
        message:
          "No AI provider is configured. Set GOOGLE_API_KEY (Gemini) or MINIMAX_API_KEY (MiniMax) in Vercel environment variables.",
        status: 503,
      },
    };
  }

  let detail = "";
  try {
    const parsed = JSON.parse(lastBody);
    detail =
      parsed?.error?.message ||
      parsed?.error?.status ||
      parsed?.base_resp?.status_msg ||
      "";
  } catch {
    detail = lastBody?.slice(0, 120) || "";
  }
  const statusHint =
    lastStatus === 429
      ? "Rate limited"
      : lastStatus === 403
        ? "API key invalid or expired"
        : lastStatus >= 500
          ? "AI service overloaded"
          : `HTTP ${lastStatus}`;
  const message = detail
    ? `${statusHint}: ${detail}`
    : `${statusHint} — extraction failed after retrying all providers`;
  console.error("AI extract exhausted all providers:", lastStatus, lastBody);
  return { ok: false, error: { message, status: 502 } };
}
