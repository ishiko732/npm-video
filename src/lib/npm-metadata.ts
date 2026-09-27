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
      };
    } catch {
      // Metadata is optional: a failed or timed-out source must not hide download data.
    }
  }

  return {};
}
