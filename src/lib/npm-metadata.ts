export function githubRepository(repository: unknown): string | null {
  if (repository && typeof repository === "object" && "url" in repository)
    repository = repository.url;
  if (typeof repository !== "string") return null;
  let value = repository
    .trim()
    .replace(/^git\+/, "")
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/^github:/, "https://github.com/");
  if (/^[\w.-]+\/[\w.-]+$/.test(value)) value = `https://github.com/${value}`;
  try {
    const url = new URL(value);
    if (
      url.hostname !== "github.com" ||
      !["https:", "http:", "git:", "ssh:"].includes(url.protocol)
    )
      return null;
    const [owner, rawRepo] = url.pathname.split("/").filter(Boolean);
    const repo = rawRepo?.replace(/\.git$/, "");

    return owner &&
      repo &&
      /^[\w-]+$/.test(owner) &&
      /^[\w.-]+$/.test(repo) &&
      repo !== "." &&
      repo !== ".."
      ? `${owner}/${repo}`
      : null;
  } catch {
    return null;
  }
}

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export async function getRepositoryStats(repository: unknown, fetchData: typeof fetch) {
  const repo = githubRepository(repository);
  if (!repo) return undefined;
  try {
    const response = await fetchData(`https://api.github.com/repos/${repo}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return undefined;
    const data = (await response.json()) as {
      private?: unknown;
      visibility?: unknown;
      stargazers_count?: unknown;
      forks_count?: unknown;
      full_name?: unknown;
    } | null;
    if (
      data?.private !== false ||
      data.visibility !== "public" ||
      !isCount(data.stargazers_count) ||
      !isCount(data.forks_count)
    )
      return undefined;
    const canonical = githubRepository(data.full_name) ?? repo;
    const stats: {url: string; stars: number; forks: number; usedBy?: number} = {
      url: `https://github.com/${canonical}`,
      stars: data.stargazers_count,
      forks: data.forks_count,
    };
    try {
      // GitHub has no public Used by API; this service caches its repository default-package count for up to seven days.
      const dependents = await fetchData(`https://dependents.info/${canonical}.json`, {
        signal: AbortSignal.timeout(4000),
      });
      if (dependents.ok) {
        const info = (await dependents.json()) as {
          owner?: unknown;
          repo?: unknown;
          total?: unknown;
        } | null;
        if (
          info &&
          `${info.owner}/${info.repo}`.toLowerCase() === canonical.toLowerCase() &&
          isCount(info.total)
        )
          stats.usedBy = info.total;
      }
    } catch {
      /* A missing dependent count must not hide stars and forks. */
    }

    return stats;
  } catch {
    return undefined;
  }
}

export async function getPackageMetadata(name: string, fetchManifest: typeof fetch) {
  const encoded = encodeURIComponent(name);
  // The published manifest contains the full description; registry metadata may truncate it.
  for (const url of [
    `https://cdn.jsdelivr.net/npm/${encoded}/package.json`,
    `https://registry.npmjs.org/${encoded}/latest`,
  ]) {
    try {
      const response = await fetchManifest(url, {signal: AbortSignal.timeout(4000)});
      if (!response.ok) continue;
      const data = (await response.json()) as {
        name?: unknown;
        repository?: unknown;
        description?: unknown;
        author?: string | {name?: unknown};
        maintainers?: Array<{name?: unknown}>;
      } | null;
      if (data?.name !== name) continue;
      const author = typeof data.author === "string" ? data.author : data.author?.name;
      const publisher =
        author ?? (Array.isArray(data.maintainers) ? data.maintainers[0]?.name : undefined);

      return {
        description: typeof data.description === "string" ? data.description : undefined,
        publisher: typeof publisher === "string" ? publisher : undefined,
        repositoryStats: await getRepositoryStats(data.repository, fetchManifest),
      };
    } catch {
      // Metadata is optional: a failed or timed-out source must not hide download data.
    }
  }

  return {};
}
