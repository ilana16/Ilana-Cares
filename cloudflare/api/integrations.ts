import type { ApiEnv } from "./types";
import nodemailer from "nodemailer";
import { Buffer } from "node:buffer";

export class CalendarIntegrationError extends Error {}

export async function googleToken(env: ApiEnv, refreshToken = env.GOOGLE_REFRESH_TOKEN): Promise<string | null> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !refreshToken) return null;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken, grant_type: "refresh_token" }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    const code = ["invalid_grant", "invalid_client", "unauthorized_client", "invalid_scope"].includes(body?.error || "") ? body!.error : `HTTP ${response.status}`;
    throw new CalendarIntegrationError(`Google authorization unavailable (${code}). Please reconnect the Google integration.`);
  }
  const result: { access_token?: string } = await response.json();
  if (!result.access_token) throw new Error("Google authorization unavailable");
  return result.access_token;
}

export async function busyTimes(env: ApiEnv) {
  // Preserve the existing public-calendar API-key authentication. OAuth is for
  // private Sheets writes and must not prevent calendar reads when it expires.
  let token = env.GOOGLE_API_KEY ? null : await googleToken(env);
  if (!token && !env.GOOGLE_API_KEY) throw new Error("Calendar is not configured");
  const start = new Date();
  const end = new Date(start); end.setMonth(end.getMonth() + 3);
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/ilana.cunningham16%40gmail.com/events");
  url.search = new URLSearchParams({ timeMin: start.toISOString(), timeMax: end.toISOString(),
    singleEvents: "true", orderBy: "startTime", timeZone: "Asia/Jerusalem", maxResults: "2500",
    ...(!token ? { key: env.GOOGLE_API_KEY! } : {}) }).toString();
  const result: { start: Date; end: Date; summary: string }[] = [];
  for (let page = 0; page < 10; page++) {
    const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      if (!token && page === 0 && [401, 403].includes(response.status) && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
        token = await googleToken(env);
        url.searchParams.delete("key");
        page--;
        continue;
      }
      const body = await response.json().catch(() => null) as { error?: { errors?: { reason?: string }[] } } | null;
      const reason = body?.error?.errors?.[0]?.reason;
      const safeReason = ["keyInvalid", "accessNotConfigured", "forbidden", "notFound", "ipRefererBlocked", "dailyLimitExceeded", "rateLimitExceeded", "authError", "badRequest"].includes(reason || "") ? `, ${reason}` : "";
      throw new CalendarIntegrationError(`Calendar availability is unavailable (Google ${response.status}${safeReason}). Please contact Ilana to confirm a time.`);
    }
    const data: { items?: { status?: string; transparency?: string; start?: { dateTime?: string }; end?: { dateTime?: string } }[]; nextPageToken?: string } = await response.json();
    for (const event of data.items ?? []) {
      if (event.status === "cancelled" || event.transparency === "transparent") continue;
      if (event.start?.dateTime && event.end?.dateTime)
        result.push({ start: new Date(event.start.dateTime), end: new Date(event.end.dateTime), summary: "Busy" });
    }
    if (!data.nextPageToken) return result;
    url.searchParams.set("pageToken", data.nextPageToken);
  }
  throw new Error("Calendar result exceeds supported range");
}

export async function email(env: ApiEnv, id: string, subject: string, text: string) {
  const address = "Ilanadevorah25@gmail.com";
  if (env.GMAIL_REFRESH_TOKEN) {
    const token = await googleToken(env, env.GMAIL_REFRESH_TOKEN);
    if (!token) throw new Error("Gmail OAuth client is not configured");
    // Encode both the subject and UTF-8 body; user text cannot add MIME headers.
    const encodedSubject = Buffer.from(subject, "utf8").toString("base64");
    if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error("Invalid notification identifier");
    const body = Buffer.from(text, "utf8").toString("base64").match(/.{1,76}/g)?.join("\r\n") || "";
    const mime = [`From: Ilana Care <${address}>`, `To: ${address}`,
      `Subject: =?UTF-8?B?${encodedSubject}?=`, `Message-ID: <${id}@ilana.care>`,
      `Date: ${new Date().toUTCString()}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64", "", body].join("\r\n");
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(address)}/messages/send`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: Buffer.from(mime, "utf8").toString("base64url") }), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const error = new Error("Gmail API delivery unavailable") as Error & { code: string; responseCode: number };
      error.code = "EGMAILAPI"; error.responseCode = response.status;
      throw error; // Keep the durable job queued; never fall back after an ambiguous send.
    }
    const sent = await response.json() as { id?: string };
    return Boolean(sent.id);
  }
  if (!env.GMAIL_APP_PASSWORD) return false;
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 587, secure: false, requireTLS: true,
    auth: { user: address, pass: env.GMAIL_APP_PASSWORD.replace(/\s/g, "") },
    connectionTimeout: 8000, greetingTimeout: 5000, socketTimeout: 10000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  try {
    const result = await transport.sendMail({ from: { name: "Ilana Care", address }, to: address,
      subject, text, messageId: `<${id}@ilana.care>` });
    return result.accepted.some(recipient => String(recipient).toLowerCase() === address.toLowerCase());
  } finally { transport.close(); }
}

export async function appendSheet(env: ApiEnv, data: Record<string, unknown>) {
  if (!env.GOOGLE_SPREADSHEET_ID) return true;
  const token = await googleToken(env);
  if (!token) return false; // An API key cannot authorize a private Sheets write.
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.GOOGLE_SPREADSHEET_ID)}/values/Bookings!A:J:append?valueInputOption=RAW`;
  const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [[data.timestamp, data.fullName, data.email, data.phone,
      `${data.numChildren} child(ren)`, "N/A", data.date, data.startTime, String(data.duration), data.additionalInfo || ""]] }),
    signal: AbortSignal.timeout(10000) });
  return response.ok;
}
