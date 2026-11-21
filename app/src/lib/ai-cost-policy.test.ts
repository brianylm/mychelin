import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FREE_AI_ONLY, PAID_PROVIDER_KEYS, PREPAID_PROVIDER_KEYS, paidProviderKey } from "./ai-cost-policy";

const SRC = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("free AI policy", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("is on", () => {
    expect(FREE_AI_ONLY).toBe(true);
  });

  it("hides OpenAI and MiniMax keys even when they are set", () => {
    for (const name of ["OPENAI_API_KEY", "MINIMAX_API_KEY"] as const) {
      process.env[name] = "sk-set-in-vercel";
      expect(paidProviderKey(name)).toBe("");
    }
  });

  it("allows only DeepSeek (prepaid credits)", () => {
    expect(PREPAID_PROVIDER_KEYS).toEqual(["DEEPSEEK_API_KEY"]);
    process.env.DEEPSEEK_API_KEY = " sk-deepseek ";
    expect(paidProviderKey("DEEPSEEK_API_KEY")).toBe("sk-deepseek");
    expect(PAID_PROVIDER_KEYS).toContain("DEEPSEEK_API_KEY");
  });

  it("no source file reads a paid key or paid endpoint except through the policy", () => {
    const keyRead = new RegExp(
      String.raw`(process\.env\.|process\.env\[["']|envValue\(["'])(` + PAID_PROVIDER_KEYS.join("|") + ")"
    );
    const paidHosts = /api\.openai\.com|api\.deepseek\.com|minimaxi?\.(com|chat)/;
    // Files allowed to name a paid host: they only build URLs, and get
    // their key from paidProviderKey().
    const hostAllowed = new Set([
      "lib/deepseek.ts",
      "lib/ai-extract.ts",
      "app/api/capture/draft-recipe/route.ts",
      "app/api/capture/transcribe-whisper/route.ts",
      "app/api/capture/realtime-transcription/route.ts",
    ]);
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const rel = relative(SRC, file);
      if (rel === "lib/ai-cost-policy.ts") continue;
      const text = readFileSync(file, "utf8");
      if (keyRead.test(text)) offenders.push(rel + ": reads a paid key directly");
      if (paidHosts.test(text) && !hostAllowed.has(rel)) offenders.push(rel + ": calls a paid host");
    }
    expect(offenders).toEqual([]);
  });
});
