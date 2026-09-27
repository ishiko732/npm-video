type Week = {week: number; total: number; days: number[]};
const daySeconds = 86_400;
const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export function milestoneStarsFromHistory(
  history: unknown[],
  currentStars: number,
  milestoneDays: string[],
) {
  const weeks: Week[] = [];
  for (const item of history) {
    const value = item as Partial<Week> | null;
    if (
      !value ||
      !isCount(value.week) ||
      value.week % daySeconds !== 0 ||
      new Date(value.week * 1000).getUTCDay() !== 0 ||
      !isCount(value.total) ||
      !Array.isArray(value.days) ||
      value.days.length !== 7 ||
      !value.days.every(isCount) ||
      value.days.reduce((sum, count) => sum + count, 0) !== value.total
    )
      return undefined;
    weeks.push(value as Week);
  }
  weeks.sort((a, b) => a.week - b.week);
  if (
    !weeks.length ||
    weeks.some(
      (week, index) => index > 0 && week.week - weeks[index - 1].week !== 7 * daySeconds,
    ) ||
    weeks.reduce((sum, week) => sum + week.total, 0) !== currentStars
  )
    return undefined;

  let total = 0;
  const result: Record<string, number> = {};
  const wanted = new Set(milestoneDays);
  const today = new Date().toISOString().slice(0, 10);
  for (const week of weeks) {
    for (let i = 0; i < 7; i++) {
      total += week.days[i];
      const day = new Date((week.week + i * daySeconds) * 1000).toISOString().slice(0, 10);
      if (wanted.has(day) && day <= today) result[day] = total;
    }
  }

  return Object.keys(result).length ? result : undefined;
}

export async function getMilestoneStars(
  repository: {url: string; stars: number} | undefined,
  days: string[],
  fetchHistory: typeof fetch,
) {
  if (!repository || days.length === 0) return undefined;
  const repo = /^https:\/\/github\.com\/([\w-]+\/[\w.-]+)$/.exec(repository.url)?.[1];
  if (!repo) return undefined;
  const signal = AbortSignal.timeout(12_000);
  try {
    const load = async (page: number) => {
      const response = await fetchHistory(
        `https://api.github.com/repos/${repo}/stargazers/history?per_page=30&page=${page}`,
        {
          signal,
          headers: {Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10"},
        },
      );
      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (!response.ok || (remaining !== null && Number(remaining) < 5))
        throw new Error("Star history unavailable");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Invalid star history");

      return {data, link: response.headers.get("Link") ?? ""};
    };
    const first = await load(1);
    const lastPage = Number(/<[^>]*[?&]page=(\d+)>; rel="last"/.exec(first.link)?.[1] ?? 1);
    if (lastPage < 1 || lastPage > 100 || (lastPage === 1 && first.link.includes('rel="next"')))
      return undefined;
    const history = [...first.data];
    for (let page = 2; page <= lastPage; page += 2) {
      const batch = await Promise.all([load(page), ...(page < lastPage ? [load(page + 1)] : [])]);
      for (const result of batch) history.push(...result.data);
    }

    return milestoneStarsFromHistory(history, repository.stars, days);
  } catch {
    // Do not present partial, stale or unavailable history as milestone counts.
    return undefined;
  }
}
