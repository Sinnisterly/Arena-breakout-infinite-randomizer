type Cache = Pick<Storage, "getItem" | "setItem">;
type Options = {
  request?: typeof fetch;
  storage?: Cache;
  signal?: AbortSignal;
};
const key = "abi-short-links-v1";
const pending = new Map<string, Promise<string>>();
function validShortLink(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^https:\/\/is\.gd\/[A-Za-z0-9_]{5,30}$/.test(value)
  );
}
function browserStorage() {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
export function isLocalAddress(value: string) {
  const host = new URL(value).hostname;
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "[::1]" ||
    /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)
  );
}
export async function shortenLink(
  target: string,
  { request = fetch, storage = browserStorage(), signal }: Options = {},
): Promise<string> {
  const url = new URL(target);
  if (!["https:", "http:"].includes(url.protocol) || isLocalAddress(target))
    throw new Error(
      "Short links become shareable after the site is published. This preview address only works on your computer.",
    );
  let entries: [string, string][] = [];
  try {
    const value = JSON.parse(storage?.getItem(key) ?? "[]");
    if (Array.isArray(value))
      entries = value
        .filter(
          (e) =>
            Array.isArray(e) &&
            typeof e[0] === "string" &&
            validShortLink(e[1]),
        )
        .slice(-100);
  } catch {}
  const cached = entries.find(([full]) => full === target);
  if (cached) return cached[1];
  const current = pending.get(target);
  if (current) return current;
  const work = (async () => {
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 10000);
    const cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) controller.abort();
    try {
      const endpoint = new URL("https://is.gd/create.php");
      endpoint.searchParams.set("format", "json");
      endpoint.searchParams.set("url", target);
      const response = await request(endpoint.href, {
        signal: controller.signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok)
        throw new Error(
          "The short-link service is unavailable. The full link still works.",
        );
      const data = await response.json();
      if (!validShortLink(data.shorturl))
        throw new Error(
          "The short-link service could not create a redirect. The full link still works.",
        );
      try {
        storage?.setItem(
          key,
          JSON.stringify([...entries, [target, data.shorturl]].slice(-100)),
        );
      } catch {}
      return data.shorturl;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", cancel);
    }
  })();
  pending.set(target, work);
  try {
    return await work;
  } finally {
    pending.delete(target);
  }
}
