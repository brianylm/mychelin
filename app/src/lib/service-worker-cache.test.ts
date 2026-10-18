import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

type WorkerEventHandler = (event: unknown) => void;

interface RequestLike {
  headers: Headers;
  method: string;
  mode: string;
  url: string;
}

function request(path: string, options?: { headers?: HeadersInit; mode?: string }): RequestLike {
  return {
    headers: new Headers(options?.headers),
    method: "GET",
    mode: options?.mode ?? "cors",
    url: `https://mychelin.test${path}`,
  };
}

function createHarness() {
  const listeners = new Map<string, WorkerEventHandler>();
  const deletedCaches: string[] = [];
  const cachePuts: string[] = [];
  let precachedUrls: string[] = [];
  let fetchResult: () => Promise<Response> = async () => new Response("online");

  const cache = {
    addAll: async (urls: string[]) => {
      precachedUrls = urls;
    },
    put: async (requested: RequestLike | string) => {
      cachePuts.push(typeof requested === "string" ? requested : requested.url);
    },
  };

  const caches = {
    delete: async (key: string) => {
      deletedCaches.push(key);
      return true;
    },
    keys: async () => [
      "mychelin-v13-shell",
      "mychelin-v13-dynamic",
      "mychelin-v14-shell",
      "mychelin-v14-dynamic",
    ],
    match: async (requested: RequestLike | string) => {
      const key = typeof requested === "string" ? requested : requested.url;
      if (key === "/offline.html") {
        return new Response("Please reconnect to continue using Mychelin.");
      }
      return undefined;
    },
    open: async () => cache,
  };

  const self = {
    addEventListener: (type: string, handler: WorkerEventHandler) => {
      listeners.set(type, handler);
    },
    clients: {
      claim: async () => undefined,
      matchAll: async () => [],
      openWindow: async () => undefined,
    },
    location: { origin: "https://mychelin.test" },
    registration: { showNotification: async () => undefined },
    skipWaiting: async () => undefined,
  };

  const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");
  runInNewContext(source, {
    Headers,
    Response,
    URL,
    caches,
    console,
    fetch: () => fetchResult(),
    self,
  });

  async function dispatchLifecycle(type: "install" | "activate") {
    let pending: Promise<unknown> = Promise.resolve();
    listeners.get(type)?.({
      waitUntil: (promise: Promise<unknown>) => {
        pending = promise;
      },
    });
    await pending;
  }

  function dispatchFetch(workerRequest: RequestLike) {
    let response: Promise<Response | undefined> | undefined;
    listeners.get("fetch")?.({
      request: workerRequest,
      respondWith: (value: Promise<Response | undefined>) => {
        response = value;
      },
    });
    return response;
  }

  return {
    cachePuts,
    deletedCaches,
    dispatchFetch,
    dispatchLifecycle,
    getPrecachedUrls: () => precachedUrls,
    rejectNetwork: () => {
      fetchResult = async () => {
        throw new Error("offline");
      };
    },
    respondWith: (response: Response) => {
      fetchResult = async () => response;
    },
  };
}

describe("service-worker session cache boundaries", () => {
  it("precaches only a neutral offline document, never the session-dependent root", async () => {
    const harness = createHarness();

    await harness.dispatchLifecycle("install");

    expect(harness.getPrecachedUrls()).toContain("/offline.html");
    expect(harness.getPrecachedUrls()).not.toContain("/");
  });

  it("removes old caches when the session cache policy version changes", async () => {
    const harness = createHarness();

    await harness.dispatchLifecycle("activate");

    expect(harness.deletedCaches).toEqual([
      "mychelin-v13-shell",
      "mychelin-v13-dynamic",
    ]);
  });

  it("does not cache HTML navigation and uses the neutral document offline", async () => {
    const harness = createHarness();
    const onlineResponse = await harness.dispatchFetch(request("/", { mode: "navigate" }));

    expect(await onlineResponse?.text()).toBe("online");
    expect(harness.cachePuts).toEqual([]);

    harness.rejectNetwork();
    const offlineResponse = await harness.dispatchFetch(request("/app", { mode: "navigate" }));
    expect(await offlineResponse?.text()).toContain("reconnect to continue using Mychelin");
    expect(harness.cachePuts).toEqual([]);
  });

  it("leaves React Server Component requests network-only", () => {
    const harness = createHarness();

    const response = harness.dispatchFetch(
      request("/app?_rsc=synthetic", { headers: { RSC: "1" } })
    );

    expect(response).toBeUndefined();
    expect(harness.cachePuts).toEqual([]);
  });

  it.each(["text/html; charset=utf-8", "text/x-component"])(
    "does not cache a %s response when request headers do not identify it",
    async (contentType) => {
      const harness = createHarness();
      harness.respondWith(
        new Response("session-dependent", {
          headers: { "Content-Type": contentType },
        })
      );

      const response = await harness.dispatchFetch(request("/entry-data"));
      expect(await response?.text()).toBe("session-dependent");
      await Promise.resolve();
      expect(harness.cachePuts).toEqual([]);
    }
  );
});
