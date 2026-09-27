import assert from "node:assert/strict";
import {getMilestoneStars, milestoneStarsFromHistory} from "../src/lib/star-history.ts";

const first = {
  week: Date.parse("2025-01-05T00:00:00Z") / 1000,
  total: 3,
  days: [1, 1, 1, 0, 0, 0, 0],
};
const second = {week: first.week + 604800, total: 2, days: [1, 0, 0, 1, 0, 0, 0]};
const days = ["2025-01-06", "2025-01-15"];
assert.deepEqual(milestoneStarsFromHistory([second, first], 5, days), {
  "2025-01-06": 2,
  "2025-01-15": 5,
});
assert.equal(
  milestoneStarsFromHistory([second], 5, days),
  undefined,
  "incomplete history must be hidden",
);
assert.equal(
  milestoneStarsFromHistory([first, second], 6, days),
  undefined,
  "inconsistent current/history snapshots must be hidden",
);
assert.equal(
  milestoneStarsFromHistory([first, {...second, week: second.week + 3600}], 5, days),
  undefined,
  "non-UTC day boundaries cannot be matched to npm dates",
);
assert.equal(
  milestoneStarsFromHistory([first, first], 6, days),
  undefined,
  "duplicate weeks must not double count",
);
assert.equal(milestoneStarsFromHistory([{...first, total: 99}], 99, days), undefined);
assert.equal(milestoneStarsFromHistory([first, second], 5, ["2024-12-01"]), undefined);
const calls = [];
const repo = {url: "https://github.com/org/repo", stars: 5};
assert.deepEqual(
  await getMilestoneStars(repo, days, async (url) => {
    calls.push(url);
    return url.endsWith("page=1")
      ? Response.json([second], {
          headers: {
            Link: '<https://api.github.com/repositories/1/stargazers/history?per_page=30&page=2>; rel="last"',
          },
        })
      : Response.json([first]);
  }),
  {"2025-01-06": 2, "2025-01-15": 5},
);
assert.equal(calls.length, 2);
assert.equal(
  await getMilestoneStars(undefined, days, () => {
    throw new Error("Must not fetch without a public repository");
  }),
  undefined,
);
assert.equal(
  await getMilestoneStars(repo, days, async () => new Response(null, {status: 403})),
  undefined,
);
assert.equal(
  await getMilestoneStars(repo, days, async () =>
    Response.json([first, second], {headers: {"X-RateLimit-Remaining": "3"}}),
  ),
  undefined,
);
console.log("Milestone star history checks passed");
