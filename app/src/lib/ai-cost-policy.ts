// AI cost policy. B, 2026-11-21: the AI setup must not run up a bill.
//
// Allowed: free-tier Google Gemini (GOOGLE_API_KEY / GEMINI_API_KEY; its
// Google Cloud project must have no billing account) and DeepSeek, which
// runs on prepaid credits (B: "it's fine to use deepseek, we have credits
// there") and stops when the credits run out. Blocked: MiniMax and OpenAI.
// paidProviderKey() returns "" for a blocked provider, so every caller
// behaves as if it is unconfigured, even when its key is set in Vercel.
//
// Every read of a paid provider's key MUST go through paidProviderKey().
// ai-cost-policy.test.ts scans the source and fails on a direct read.
export const FREE_AI_ONLY = true;

export const PAID_PROVIDER_KEYS = [
  "DEEPSEEK_API_KEY",
  "MINIMAX_API_KEY",
  "OPENAI_API_KEY",
] as const;

export type PaidProviderKey = (typeof PAID_PROVIDER_KEYS)[number];

// Prepaid, capped by the credit balance: allowed even in free-only mode.
export const PREPAID_PROVIDER_KEYS: readonly PaidProviderKey[] = ["DEEPSEEK_API_KEY"];

export function paidProviderKey(name: PaidProviderKey): string {
  if (FREE_AI_ONLY && !PREPAID_PROVIDER_KEYS.includes(name)) return "";
  return process.env[name]?.trim() ?? "";
}
