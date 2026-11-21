import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateGeminiText } from "./gemini-free";

function fakeFetch(responses: Record<string, { status: number; body: unknown }>, calls: string[]) {
  return (async (url: string, init: RequestInit) => {
    const model = /models\/([^:]+):/.exec(url)![1];
    calls.push(model);
    const body = JSON.parse(String(init.body));
    expect(body.generationConfig.thinkingConfig).toBeDefined();
    expect(url).not.toContain("key=");
    const r = responses[model];
    return new Response(typeof r.body === "string" ? r.body : JSON.stringify(r.body), { status: r.status });
  }) as unknown as typeof fetch;
}

const ok = (text: string, finishReason = "STOP") => ({
  candidates: [{ finishReason, content: { parts: [{ text }] } }],
});

describe("generateGeminiText", () => {
  const saved = process.env.GOOGLE_API_KEY;
  beforeEach(() => {
    process.env.GOOGLE_API_KEY = "test-key";
  });
  afterEach(() => {
    process.env.GOOGLE_API_KEY = saved;
  });

  it("walks the chain past quota, overload and truncated output", async () => {
    const calls: string[] = [];
    const result = await generateGeminiText({
      prompt: "x",
      models: ["a", "b", "c", "d"],
      fetchImpl: fakeFetch(
        {
          a: { status: 429, body: "quota" },
          b: { status: 503, body: "busy" },
          c: { status: 200, body: ok('{"title":"cut', "MAX_TOKENS") },
          d: { status: 200, body: ok('{"title":"Chicken rice"}') },
        },
        calls
      ),
    });
    expect(calls).toEqual(["a", "b", "c", "d"]);
    expect(result).toEqual({ ok: true, text: '{"title":"Chicken rice"}', model: "d" });
  });

  it("ignores thought parts", async () => {
    const calls: string[] = [];
    const body = {
      candidates: [
        { finishReason: "STOP", content: { parts: [{ text: "thinking...", thought: true }, { text: "{}" }] } },
      ],
    };
    const result = await generateGeminiText({
      prompt: "x",
      models: ["a"],
      fetchImpl: fakeFetch({ a: { status: 200, body } }, calls),
    });
    expect(result).toMatchObject({ ok: true, text: "{}" });
  });

  it("reports quota when every model is rate limited", async () => {
    const calls: string[] = [];
    const result = await generateGeminiText({
      prompt: "x",
      models: ["a", "b"],
      fetchImpl: fakeFetch({ a: { status: 429, body: "" }, b: { status: 429, body: "" } }, calls),
    });
    expect(result).toMatchObject({ ok: false, status: 429, reason: "quota" });
  });

  it("stops on an auth error", async () => {
    const calls: string[] = [];
    await generateGeminiText({
      prompt: "x",
      models: ["a", "b"],
      fetchImpl: fakeFetch({ a: { status: 403, body: "bad key" }, b: { status: 200, body: ok("{}") } }, calls),
    });
    expect(calls).toEqual(["a"]);
  });

  it("is not configured without a key", async () => {
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const result = await generateGeminiText({ prompt: "x", models: ["a"] });
    expect(result).toMatchObject({ ok: false, reason: "not_configured" });
  });
});
