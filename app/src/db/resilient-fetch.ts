import { fetch } from "cross-fetch";

export function isConnectionReset(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const { code, cause, message } = error as {
    code?: unknown;
    cause?: { code?: unknown } | null;
    message?: unknown;
  };
  return [code, cause?.code].some(
    (value) => value === "ECONNRESET" || value === "EPIPE" || value === "UND_ERR_SOCKET"
  ) || (typeof message === "string" && /socket hang up|other side closed/i.test(message));
}

export function createResilientFetch(baseFetch: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    // Clone before fetch consumes the body. Both native and cross-fetch
    // Requests expose clone(), while strings and URLs do not.
    const retryInput = typeof input === "object" && "clone" in input ? input.clone() : input;
    try {
      return await baseFetch(input, init);
    } catch (error) {
      if (!isConnectionReset(error)) throw error;
      return baseFetch(retryInput, init);
    }
  };
}

export const resilientFetch = createResilientFetch();

export function libsqlFetchOption(): { fetch?: typeof resilientFetch } {
  // Keep the library's existing transport on Vercel (including Edge).
  return process.env.VERCEL === "1" ? {} : { fetch: resilientFetch };
}
