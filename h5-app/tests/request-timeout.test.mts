import assert from "node:assert/strict";
import test from "node:test";
import { fetchWithTimeout } from "../src/lib/request-timeout.ts";

test("fetchWithTimeout rejects instead of leaving a request pending forever", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      });
    })) as typeof fetch;

  try {
    await assert.rejects(
      () => fetchWithTimeout("https://example.com/never", {}, 5),
      /请求超时，请稍后重试。/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
