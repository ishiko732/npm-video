type Entry = {body: string; headers: [string, string][]; status: number; expires: number};
const memory = new Map<string, Entry>();
const pending = new Map<string, Promise<Entry>>();
const prefix = "npm-video:fetch:v1:";
const ttl = 5 * 60 * 1000;

function read(key: string): Entry | undefined {
  let entry = memory.get(key);
  try {
    if (!entry && typeof localStorage !== "undefined") {
      const stored = JSON.parse(localStorage.getItem(prefix + key) ?? "null") as Entry | null;
      if (
        stored &&
        typeof stored.body === "string" &&
        Array.isArray(stored.headers) &&
        typeof stored.expires === "number" &&
        typeof stored.status === "number"
      )
        entry = stored;
    }
  } catch {
    /* Storage can be unavailable or full in private browsing. */
  }
  if (entry && entry.expires > Date.now()) return entry;
  memory.delete(key);
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(prefix + key);
  } catch {
    /* Optional cache. */
  }
}

export const cachedFetch: typeof fetch = async (input, init) => {
  if (input instanceof Request || (init?.method && init.method !== "GET"))
    return fetch(input, init);
  const key = String(input);
  let entry = read(key);
  if (!entry) {
    let request = pending.get(key);
    if (!request) {
      request = (async () => {
        const response = await fetch(input, init);
        const retryAfter = response.headers.get("Retry-After");
        const retryMs =
          retryAfter && /^\d+$/.test(retryAfter)
            ? Number(retryAfter) * 1000
            : Math.max(1000, Date.parse(retryAfter ?? "") - Date.now()) || 60_000;
        const result: Entry = {
          body: await response.text(),
          headers: Array.from(response.headers.entries()),
          status: response.status,
          expires: Date.now() + (response.status === 429 ? retryMs : ttl),
        };
        if (response.ok || response.status === 429) {
          memory.set(key, result);
          if (memory.size > 100) memory.delete(memory.keys().next().value!);
          try {
            if (typeof localStorage !== "undefined")
              localStorage.setItem(prefix + key, JSON.stringify(result));
          } catch {
            /* Optional cache. */
          }
        }

        return result;
      })();
      pending.set(key, request);
    }
    try {
      entry = await request;
    } finally {
      if (pending.get(key) === request) pending.delete(key);
    }
  }
  if (entry.status === 429)
    throw new Error("npm request limit reached. Please wait before trying again.");

  return new Response(entry.body, {status: entry.status, headers: entry.headers});
};
