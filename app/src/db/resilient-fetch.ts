
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

// libsql hands us whatever Request class its environment uses: Next's own
// (from another realm, so `instanceof Request` is unreliable) or cross-fetch's
// in plain Node (e2e helpers). cross-fetch rejects native Requests ("Only
// absolute URLs are supported") and native fetch rejects cross-fetch ones
// ("Failed to parse URL from [object Request]"). So never pass a Request
// object across: unpack any Request-like into url + plain init and call the
// runtime's native fetch.
interface RequestLike {
  url: string;
  method: string;
  headers: { forEach(callback: (value: string, key: string) => void): void };
  arrayBuffer(): Promise<ArrayBuffer>;
}

function isRequestLike(input: unknown): input is RequestLike {
  return (
    typeof input === "object" &&
    input !== null &&
    !(input instanceof URL) &&
    typeof (input as RequestLike).url === "string" &&
    typeof (input as RequestLike).method === "string" &&
    typeof (input as RequestLike).arrayBuffer === "function"
  );
}

const nativeFetch: typeof fetch = async (input, init) => {
  if (!isRequestLike(input)) return globalThis.fetch(input, init);
  const headers: Record<string, string> = {};
  input.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const method = (init?.method ?? input.method).toUpperCase();
  const body =
    init?.body !== undefined
      ? init.body
      : method === "GET" || method === "HEAD"
        ? undefined
        : await input.arrayBuffer();
  return globalThis.fetch(input.url, {
    ...init,
    method,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    body,
  });
};

export function createResilientFetch(baseFetch: typeof fetch = nativeFetch): typeof fetch {
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
