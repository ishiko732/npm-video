import assert from "node:assert/strict";
import {githubRepository, getRepositoryStats} from "../src/lib/npm-metadata.ts";

for (const value of [
  "git+https://github.com/org/repo.git",
  "git@github.com:org/repo.git",
  "github:org/repo",
  "org/repo",
  {url: "https://github.com/org/repo/tree/main"},
])
  assert.equal(githubRepository(value), "org/repo");
for (const value of [
  null,
  "https://github.com.evil.test/org/repo",
  "https://gitlab.com/org/repo",
  "javascript:alert(1)",
])
  assert.equal(githubRepository(value), null);
const calls = [];
assert.deepEqual(
  await getRepositoryStats("org/repo", async (url) => {
    calls.push(url);
    return Response.json(
      url.includes("api.github.com")
        ? {
            private: false,
            visibility: "public",
            full_name: "org/repo",
            stargazers_count: 799,
            forks_count: 73,
          }
        : {owner: "org", repo: "repo", total: 368},
    );
  }),
  {url: "https://github.com/org/repo", stars: 799, forks: 73, usedBy: 368},
);
assert.equal(calls.length, 2);
let privateCalls = 0;
assert.equal(
  await getRepositoryStats("org/private", async () => {
    privateCalls++;
    return Response.json({
      private: true,
      visibility: "private",
      stargazers_count: 100,
      forks_count: 1,
    });
  }),
  undefined,
);
assert.equal(privateCalls, 1, "private repositories must never be sent to the dependent service");
assert.deepEqual(
  await getRepositoryStats("org/repo", async (url) => {
    if (url.includes("dependents.info")) throw new Error("offline");
    return Response.json({
      private: false,
      visibility: "public",
      stargazers_count: 0,
      forks_count: 0,
    });
  }),
  {url: "https://github.com/org/repo", stars: 0, forks: 0},
  "unknown Used by must be omitted, not zero",
);
assert.equal(
  await getRepositoryStats("org/repo", async () => new Response(null, {status: 404})),
  undefined,
);
assert.equal(
  await getRepositoryStats("org/repo", async () => {
    throw new Error("timeout");
  }),
  undefined,
);
console.log("Repository stats checks passed");
