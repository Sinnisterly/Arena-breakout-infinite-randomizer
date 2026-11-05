import { describe, expect, it, vi } from "vitest";
import { shortenLink } from "./shortener";

describe("automatic short links", () => {
  it("sends the entire fragment and reuses the cached redirect", async () => {
    const cache = new Map<string, string>();
    const storage = {
      getItem: (key: string) => cache.get(key) ?? null,
      setItem: (key: string, value: string) => cache.set(key, value),
    };
    const target = "https://example.com/abi/#kit=2.hello_world-test";
    const request = vi.fn(async (input: RequestInfo | URL) => {
      expect(new URL(String(input)).searchParams.get("url")).toBe(target);
      return Response.json({ shorturl: "https://is.gd/abc123" });
    });
    expect(await shortenLink(target, { request, storage })).toBe(
      "https://is.gd/abc123",
    );
    expect(await shortenLink(target, { request, storage })).toBe(
      "https://is.gd/abc123",
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("rejects service errors and unexpected redirect domains", async () => {
    const request = vi.fn(async () =>
      Response.json({ errorcode: 3, errormessage: "Rate limit reached" }),
    );
    await expect(
      shortenLink("https://example.com/#kit=error", { request }),
    ).rejects.toThrow();
    await expect(
      shortenLink("https://example.com/#kit=invalid", {
        request: async () =>
          Response.json({ shorturl: "https://other.example/test" }),
      }),
    ).rejects.toThrow();
  });
  it("does not create unusable public redirects to a local preview", async () => {
    const request = vi.fn();
    await expect(
      shortenLink("http://localhost:4173/#kit=local", { request }),
    ).rejects.toThrow(/published/);
    expect(request).not.toHaveBeenCalled();
  });
});
