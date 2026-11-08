import { Request as CrossFetchRequest } from "cross-fetch";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createResilientFetch,
  isConnectionReset,
  libsqlFetchOption,
  resilientFetch,
} from "./resilient-fetch";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isConnectionReset", () => {
  it.each(["ECONNRESET", "EPIPE", "UND_ERR_SOCKET"])(
    "recognizes %s on the error or its cause",
    (code) => {
      expect(isConnectionReset({ code })).toBe(true);
      expect(isConnectionReset({ cause: { code } })).toBe(true);
      expect(isConnectionReset({ code: "OTHER", cause: { code } })).toBe(true);
    }
  );

  it("recognizes reset messages without error codes", () => {
    expect(isConnectionReset(new Error("request failed: socket hang up"))).toBe(true);
    expect(isConnectionReset(new Error("Other Side Closed"))).toBe(true);
  });

  it.each([undefined, null, "socket hang up", 500, {}, { code: "ETIMEDOUT" }, new Error("fetch failed")])(
    "rejects unrelated values: %s",
    (error) => {
      expect(isConnectionReset(error)).toBe(false);
    }
  );
});

describe("createResilientFetch", () => {
  const url = "https://database.example.test/v2/pipeline";

  it("retries once on ECONNRESET and returns the second response", async () => {
    const response = new Response("ok");
    const baseFetch = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(Object.assign(new Error("connection reset"), { code: "ECONNRESET" }))
      .mockResolvedValueOnce(response);
    const init = { method: "POST", body: "{}" };

    await expect(createResilientFetch(baseFetch)(url, init)).resolves.toBe(response);
    expect(baseFetch).toHaveBeenCalledTimes(2);
    expect(baseFetch).toHaveBeenNthCalledWith(1, url, init);
    expect(baseFetch).toHaveBeenNthCalledWith(2, url, init);
  });

  it("retries a cross-fetch style FetchError with socket hang up", async () => {
    const error = Object.assign(new Error("request failed, reason: socket hang up"), {
      name: "FetchError",
      type: "system",
    });
    const response = new Response("ok");
    const baseFetch = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(response);

    await expect(createResilientFetch(baseFetch)(url)).resolves.toBe(response);
    expect(baseFetch).toHaveBeenCalledTimes(2);
  });

  it("rethrows a non-reset error without retrying", async () => {
    const error = new Error("DNS lookup failed");
    const baseFetch = vi.fn<typeof fetch>().mockRejectedValue(error);

    await expect(createResilientFetch(baseFetch)(url)).rejects.toBe(error);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  it("returns an HTTP 500 response without retrying", async () => {
    const response = new Response("socket hang up", { status: 500 });
    const baseFetch = vi.fn<typeof fetch>().mockResolvedValue(response);

    await expect(createResilientFetch(baseFetch)(url)).resolves.toBe(response);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  it("gives up after one retry and throws the second reset", async () => {
    const first = Object.assign(new Error("first reset"), { code: "ECONNRESET" });
    const second = new TypeError("fetch failed", { cause: { code: "UND_ERR_SOCKET" } });
    const baseFetch = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(first)
      .mockRejectedValueOnce(second);

    await expect(createResilientFetch(baseFetch)(url)).rejects.toBe(second);
    expect(baseFetch).toHaveBeenCalledTimes(2);
  });

  it.each([Request, CrossFetchRequest])("preserves the Request JSON body on retry (%#)", async (RequestClass) => {
    const body = { requests: [{ type: "execute", stmt: { sql: "SELECT 1" } }] };
    const request = new RequestClass(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const response = new Response("ok");
    const baseFetch = vi.fn<typeof fetch>()
      .mockImplementationOnce(async (input) => {
        expect(input).toBe(request);
        expect(await (input as Request).json()).toEqual(body);
        throw Object.assign(new Error("connection reset"), { code: "ECONNRESET" });
      })
      .mockImplementationOnce(async (input) => {
        expect(input).not.toBe(request);
        expect(await (input as Request).json()).toEqual(body);
        return response;
      });

    await expect(createResilientFetch(baseFetch)(request)).resolves.toBe(response);
    expect(baseFetch).toHaveBeenCalledTimes(2);
  });
});

describe("libsqlFetchOption", () => {
  it("returns no fetch override when VERCEL=1", () => {
    vi.stubEnv("VERCEL", "1");
    expect(libsqlFetchOption()).toEqual({});
  });

  it.each([undefined, "0", "true"])("returns resilientFetch when VERCEL=%s", (value) => {
    vi.stubEnv("VERCEL", value);
    expect(libsqlFetchOption()).toEqual({ fetch: resilientFetch });
  });
});
