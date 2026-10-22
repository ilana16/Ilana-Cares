/**
 * TEMPORARY migration-only Cloudflare Pages Function.
 * Same-origin API forwarding to the existing Railway service.
 * Allows Cloudflare preview of the React frontend without moving
 * the live MySQL database yet. Remove once the API is on Workers/D1.
 *
 * IMPORTANT: Do not delete/stop Railway while this file is in use.
 */
interface Env {
  // Override with a secret/plaintext Pages environment variable if needed.
  RAILWAY_API_ORIGIN?: string;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const source = env.RAILWAY_API_ORIGIN || "https://ilana-cares-production.up.railway.app";
  const base = new URL(source);
  if (base.protocol !== "https:" || base.hostname !== "ilana-cares-production.up.railway.app") {
    return new Response("API upstream is not configured safely", { status: 500 });
  }
  const inbound = new URL(request.url);
  if (!inbound.pathname.startsWith("/api/")) {
    return new Response("Not found", { status: 404 });
  }
  const target = new URL(inbound.pathname + inbound.search, base);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("x-forwarded-host");
  const upstream = new Request(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });
  try {
    const response = await fetch(upstream);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Cache-Control", "private, no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch {
    return new Response("Booking API temporarily unavailable", { status: 502 });
  }
};
