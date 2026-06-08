export interface DeepSeekJsonResult {
  text: string;
  model: string;
}

export interface DeepSeekCallOptions {
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

function envValue(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function deepSeekBaseUrl(): string {
  return (envValue("DEEPSEEK_BASE_URL") || "https://api.deepseek.com").replace(/\/$/, "");
}

export function deepSeekModel(): string {
  return envValue("DEEPSEEK_MODEL") || "deepseek-v4-flash";
}

export function isDeepSeekConfigured(): boolean {
  return Boolean(envValue("DEEPSEEK_API_KEY"));
}

export async function callDeepSeekJson({
  system,
  prompt,
  temperature = 0.2,
  maxTokens = 2200,
}: DeepSeekCallOptions): Promise<DeepSeekJsonResult> {
  const apiKey = envValue("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY missing");

  const response = await fetch(deepSeekBaseUrl() + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: deepSeekModel(),
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error("DeepSeek failed: " + response.status + " " + text.slice(0, 300));
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned no content");
  return { text: content, model: deepSeekModel() };
}
