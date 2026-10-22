// Pages has no interval timer. Keep the existing minute-by-minute notification retry
// by invoking the public health endpoint, which drains a bounded durable D1 outbox.
export default {
  async scheduled(_event: ScheduledController, _env: unknown, ctx: ExecutionContext) {
    ctx.waitUntil((async () => {
      const url = new URL("https://ilana.care/api/trpc/system.health");
      url.searchParams.set("input", JSON.stringify({ json: { timestamp: Date.now() } }));
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok || response.headers.get("X-Ilana-Storage") !== "cloudflare-d1")
        throw new Error("D1 notification retry endpoint unavailable");
      await response.body?.cancel();
    })());
  },
};
