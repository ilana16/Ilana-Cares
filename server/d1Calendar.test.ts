import { afterEach, expect, it, vi } from "vitest";
import { busyTimes } from "../cloudflare/api/integrations";
import type { ApiEnv } from "../cloudflare/api/types";

afterEach(() => vi.unstubAllGlobals());

it("reads the public calendar with its API key even when OAuth credentials are present", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [
    { start: { dateTime: "2026-11-01T10:00:00Z" }, end: { dateTime: "2026-11-01T12:00:00Z" }, summary: "Private title" },
  ] })));
  vi.stubGlobal("fetch", fetchMock);
  const result = await busyTimes({ GOOGLE_API_KEY: "test-key", GOOGLE_CLIENT_ID: "expired-client",
    GOOGLE_CLIENT_SECRET: "test-secret", GOOGLE_REFRESH_TOKEN: "expired-token" } as ApiEnv);
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url, options] = fetchMock.mock.calls[0];
  expect(url.hostname).toBe("www.googleapis.com");
  expect(url.searchParams.get("key")).toBe("test-key");
  expect(options.headers).toEqual({});
  expect(result).toEqual([{ start: new Date("2026-11-01T10:00:00Z"), end: new Date("2026-11-01T12:00:00Z"), summary: "Busy" }]);
});
