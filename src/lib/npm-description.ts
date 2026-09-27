// Registry metadata can truncate descriptions at 255 characters.
export async function getPackageDescription(
  name: string,
  version: string | undefined,
  description: string | undefined,
  fetchManifest: typeof fetch,
) {
  if (description?.length !== 255 || !version) return description;

  try {
    const response = await fetchManifest(
      `https://cdn.jsdelivr.net/npm/${encodeURIComponent(name)}@${encodeURIComponent(version)}/package.json`,
      {signal: AbortSignal.timeout(5000)},
    );
    if (!response.ok) return description;
    const manifest = (await response.json()) as {
      name?: unknown;
      version?: unknown;
      description?: unknown;
    } | null;
    if (
      manifest?.name === name &&
      manifest?.version === version &&
      typeof manifest?.description === "string" &&
      manifest.description.startsWith(description)
    ) {
      return manifest.description;
    }
  } catch {
    // An optional metadata lookup must not prevent the video from loading.
  }

  return description;
}
