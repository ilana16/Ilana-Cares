import type { ApiEnv } from "./types";
import nodemailer from "nodemailer";

export async function googleToken(env: ApiEnv): Promise<string | null> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) return null;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: "refresh_token" }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Google authorization unavailable");
  const result: { access_token?: string } = await response.json();
  if (!result.access_token) throw new Error("Google authorization unavailable");
  return result.access_token;
}

export async function busyTimes(env: ApiEnv) {
  const token = await googleToken(env);
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
    if (!response.ok) throw new Error("Calendar is temporarily unavailable");
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
  if (!env.GMAIL_APP_PASSWORD) return false;
  const address = "Ilanadevorah25@gmail.com";
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true,
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
