import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRANSCRIBE_MODELS,
  buildTranscribePrompt,
  generationConfigFor,
  parseGeminiSegments,
  thinkingConfigFor,
  transcribeModelChain,
  transcribeWithModelChain,
  type ModelAttempt,
} from "./gemini-transcribe";

const okResponse = (text: string, finishReason = "STOP") => ({
  candidates: [{ finishReason, content: { parts: [{ text }] } }],
});

describe("buildTranscribePrompt", () => {
  it("auto mode does not bias toward a Chinese dialect", () => {
    const prompt = buildTranscribePrompt("auto");
    expect(prompt).toContain("do not assume it");
    expect(prompt).toContain("English stays English");
    expect(prompt).not.toMatch(/most likely a Chinese dialect/i);
  });

  it("treats a missing language as auto", () => {
    expect(buildTranscribePrompt(undefined)).toBe(buildTranscribePrompt("auto"));
  });

  it("explicit Hokkien still keeps English words in English", () => {
    expect(buildTranscribePrompt("hokkien")).toContain("keep those words in English");
  });
});

describe("thinking config", () => {
  it("turns thinking off for 2.5 models", () => {
    expect(thinkingConfigFor("gemini-2.5-flash")).toEqual({ thinkingBudget: 0 });
  });

  it("uses the minimal level for 3.5 flash and flash-lite", () => {
    expect(thinkingConfigFor("gemini-3.5-flash")).toEqual({ thinkingLevel: "minimal" });
    expect(thinkingConfigFor("gemini-3.5-flash-lite")).toEqual({ thinkingLevel: "minimal" });
  });

  it("falls back to low for other models", () => {
    expect(thinkingConfigFor("gemini-3.8-flash")).toEqual({ thinkingLevel: "low" });
  });

  it("leaves enough output room for a 10 s chunk", () => {
    expect(generationConfigFor("gemini-2.5-flash").maxOutputTokens).toBeGreaterThanOrEqual(2048);
  });
});

describe("transcribeModelChain", () => {
  it("defaults to the tested chain", () => {
    expect(transcribeModelChain(undefined)).toEqual([...DEFAULT_TRANSCRIBE_MODELS]);
    expect(transcribeModelChain("  ")).toEqual([...DEFAULT_TRANSCRIBE_MODELS]);
  });

  it("reads a comma list from the env", () => {
    expect(transcribeModelChain("a, b ,,c")).toEqual(["a", "b", "c"]);
  });
});

describe("parseGeminiSegments", () => {
  it("parses segments and trims", () => {
    const data = okResponse('{"segments":[{"speaker":"Speaker 1","text":" one whole chicken "}]}');
    expect(parseGeminiSegments(data)).toEqual([{ speaker: "Speaker 1", text: "one whole chicken" }]);
  });

  it("treats truncated JSON (MAX_TOKENS) as unusable, not as silence", () => {
    const data = okResponse('{"segments":[{"speaker":"Speaker 1","text":"to clean th', "MAX_TOKENS");
    expect(parseGeminiSegments(data)).toBeNull();
  });

  it("treats an empty STOP as silence", () => {
    expect(parseGeminiSegments(okResponse(""))).toEqual([]);
  });

  it("treats an empty non-STOP as unusable", () => {
    expect(parseGeminiSegments(okResponse("", "MAX_TOKENS"))).toBeNull();
  });

  it("joins multi-part text and strips fences", () => {
    const data = {
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: '```json\n{"segments":[{"text":"hi' }, { text: '"}]}\n```' }] },
        },
      ],
    };
    expect(parseGeminiSegments(data)).toEqual([{ speaker: "Speaker 1", text: "hi" }]);
  });
});

describe("transcribeWithModelChain", () => {
  const good = okResponse('{"segments":[{"speaker":"Speaker 1","text":"poach it"}]}');

  it("moves to the next model on 429 and 503", async () => {
    const calls: string[] = [];
    const responses: Record<string, ModelAttempt> = {
      a: { kind: "http", status: 429, body: "quota" },
      b: { kind: "http", status: 503, body: "busy" },
      c: { kind: "ok", data: good },
    };
    const outcome = await transcribeWithModelChain(["a", "b", "c"], async (m) => {
      calls.push(m);
      return responses[m];
    });
    expect(calls).toEqual(["a", "b", "c"]);
    expect(outcome).toEqual({ ok: true, model: "c", segments: [{ speaker: "Speaker 1", text: "poach it" }] });
  });

  it("moves on when a model returns truncated output", async () => {
    const outcome = await transcribeWithModelChain(["a", "b"], async (m) =>
      m === "a"
        ? { kind: "ok", data: okResponse('{"segments":[{"text":"cut', "MAX_TOKENS") }
        : { kind: "ok", data: good }
    );
    expect(outcome.ok && outcome.model).toBe("b");
  });

  it("reports quota when every model is rate limited", async () => {
    const outcome = await transcribeWithModelChain(["a", "b"], async () => ({
      kind: "http",
      status: 429,
      body: "",
    }));
    expect(outcome).toMatchObject({ ok: false, reason: "quota" });
  });

  it("stops on an auth error instead of burning the chain", async () => {
    const calls: string[] = [];
    const outcome = await transcribeWithModelChain(["a", "b"], async (m) => {
      calls.push(m);
      return { kind: "http", status: 403, body: "bad key" };
    });
    expect(calls).toEqual(["a"]);
    expect(outcome).toMatchObject({ ok: false, reason: "unavailable" });
  });
});
