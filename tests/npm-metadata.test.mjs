import assert from "node:assert/strict";
import {getPackageMetadata} from "../src/lib/npm-metadata.ts";

const name = "@heroui/react";
const calls = [];
const result = await getPackageMetadata(name, async (url, init) => {
  calls.push(url);
  assert.ok(init.signal instanceof AbortSignal);
  return Response.json({name, description: "full description", author: {name: "HeroUI"}});
});
assert.deepEqual(result, {description: "full description", publisher: "HeroUI"});
assert.equal(calls.length, 1, "a working CDN must avoid the registry entirely");
assert.match(calls[0], /cdn\.jsdelivr\.net/);
let fallbackCalls = 0;
assert.deepEqual(
  await getPackageMetadata(name, async () => {
    if (++fallbackCalls === 1) throw new DOMException("timeout", "TimeoutError");
    return Response.json({name, description: "fallback"});
  }),
  {description: "fallback", publisher: undefined},
);
assert.equal(fallbackCalls, 2);
assert.deepEqual(
  await getPackageMetadata(name, async () => {
    throw new Error("offline");
  }),
  {},
  "metadata outages must not fail download data",
);
assert.deepEqual(
  await getPackageMetadata(name, async () =>
    Response.json({name: "different", description: "wrong"}),
  ),
  {},
);
console.log("Metadata fallback checks passed");
