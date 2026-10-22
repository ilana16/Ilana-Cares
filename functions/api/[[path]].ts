import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { d1Router, flushNotifications } from "../../cloudflare/api/router";
import type { ApiEnv } from "../../cloudflare/api/types";

export const onRequest: PagesFunction<ApiEnv> = async context => {
  const { request, env } = context;
  const url = new URL(request.url);
  if (!env.DB) return new Response("Database is not configured", { status: 503 });
  if (request.method === "POST") {
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return new Response("Forbidden", { status: 403 });
    if (Number(request.headers.get("Content-Length") || 0) > 32768)
      return new Response("Request too large", { status: 413 });
  }
  if (!url.pathname.startsWith("/api/trpc/"))
    return new Response("Not found", { status: 404 });
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: d1Router,
    createContext: () => ({ env, request }),
    onError: ({ error }) => console.error("API error", { code: error.code }),
  });
  context.waitUntil(flushNotifications(env).catch(() => console.error("Notification delivery deferred")));
  const result = new Response(response.body, response);
  result.headers.set("Cache-Control", "private, no-store");
  result.headers.set("X-Ilana-Storage", "cloudflare-d1");
  return result;
};
