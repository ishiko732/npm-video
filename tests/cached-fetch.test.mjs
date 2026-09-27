import assert from "node:assert/strict";
import {cachedFetch} from "../src/lib/cached-fetch.ts";

const originalFetch = globalThis.fetch;
const originalNow = Date.now;
let now = 1_000_000;
let calls = 0;
Date.now = () => now;
try {
  globalThis.fetch = async () => {
    calls++;
    return Response.json({downloads: 42});
  };
  const responses = await Promise.all([
    cachedFetch("https://example.com/data"),
    cachedFetch("https://example.com/data"),
  ]);
  assert.equal(calls, 1, "deduplicate concurrent requests");
  assert.deepEqual(
    await responses[0].json(),
    await responses[1].json(),
    "independent response bodies",
  );
  await cachedFetch("https://example.com/data");
  assert.equal(calls, 1, "reuse fresh cache");
  now += 300_001;
  await cachedFetch("https://example.com/data");
  assert.equal(calls, 2, "refresh expired cache");
  globalThis.fetch = async () => {
    calls++;
    return new Response("limit", {status: 429, headers: {"Retry-After": "60"}});
  };
  await assert.rejects(cachedFetch("https://example.com/limited"), /limit/);
  const afterLimit = calls;
  await assert.rejects(cachedFetch("https://example.com/limited"), /limit/);
  assert.equal(calls, afterLimit, "respect retry-after without more requests");
  now += 60_001;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ok: true});
  };
  assert.deepEqual(await (await cachedFetch("https://example.com/limited")).json(), {ok: true});
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  await assert.rejects(cachedFetch("https://example.com/retry"), /offline/);
  globalThis.fetch = async () => Response.json({recovered: true});
  assert.deepEqual(await (await cachedFetch("https://example.com/retry")).json(), {
    recovered: true,
  });
  console.log("Cache checks passed");
} finally {
  globalThis.fetch = originalFetch;
  Date.now = originalNow;
}
