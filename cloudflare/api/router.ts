import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { requireReviewAdmin } from "../../server/reviewAuth";
import { busyTimes, email, appendSheet, CalendarIntegrationError } from "./integrations";
import type { ApiEnv } from "./types";

type Context = { env: ApiEnv; request: Request };
const t = initTRPC.context<Context>().create({ transformer: superjson, isDev: false });
const p = t.procedure;
const tokenInput = z.object({ token: z.string().min(1).max(10000) });
const admin = p.input(tokenInput).use(async ({ input, next }) => {
  await requireReviewAdmin(input.token);
  return next();
});
const idInput = z.object({ id: z.number().int().positive() });
const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const date = (value: string) => new Date(value.replace(" ", "T") + "Z");
type ReviewRow = { id: number; publicName: string; email: string | null; rating: number; comment: string;
  status: "pending" | "approved" | "rejected"; reply: string | null; createdAt: string; notificationSentAt: string | null };
function review(row: ReviewRow) {
  return { ...row, createdAt: date(row.createdAt), notificationSentAt: row.notificationSentAt ? date(row.notificationSentAt) : null };
}

async function limit(ctx: Context, kind: string, maximum: number) {
  const ip = ctx.request.headers.get("CF-Connecting-IP") || "local";
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip))))
    .map(n => n.toString(16).padStart(2, "0")).join("");
  const bucket = Math.floor(Date.now() / 3600000);
  const result = await ctx.env.DB.prepare("INSERT INTO submission_limits (key,count,expiresAt) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count")
    .bind(`${kind}:${bucket}:${hash}`, (bucket + 1) * 3600000).first<{ count: number }>();
  if (!result || result.count > maximum) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait before submitting again." });
}

// A record and its delivery jobs commit together. No successful submission depends on email uptime.
async function save(ctx: Context, kind: "booking" | "contact" | "review", sql: string, values: (string | number | null)[], input: Record<string, unknown>) {
  const payload = JSON.stringify({ ...input, timestamp: new Date().toISOString() });
  const jobId = crypto.randomUUID();
  const statements = [ctx.env.DB.prepare(sql).bind(...values),
    ctx.env.DB.prepare("INSERT INTO notification_outbox (id,kind,recordId,payload) VALUES (?,?,last_insert_rowid(),?)")
      .bind(jobId, kind, payload)];
  if (kind === "booking" && ctx.env.GOOGLE_SPREADSHEET_ID)
    statements.push(ctx.env.DB.prepare("INSERT INTO notification_outbox (id,kind,recordId,payload) SELECT ?, 'sheet', recordId, payload FROM notification_outbox WHERE id=?")
      .bind(`sheet-${jobId}`, jobId));
  await ctx.env.DB.batch(statements);
}

type Job = { id: string; kind: string; recordId: number; payload: string; attempts: number };
export async function flushNotifications(env: ApiEnv) {
  // Bound work per request. Failed jobs remain durable and are retried on subsequent site/admin requests.
  const timestamp = Date.now();
  const { results } = await env.DB.prepare("SELECT id,kind,recordId,payload,attempts FROM notification_outbox WHERE sentAt IS NULL AND nextAttemptAt<=? AND leaseUntil<? ORDER BY createdAt LIMIT 1")
    .bind(timestamp, timestamp).all<Job>();
  for (const job of results) {
    const claim = await env.DB.prepare("UPDATE notification_outbox SET leaseUntil=?,attempts=attempts+1 WHERE id=? AND sentAt IS NULL AND leaseUntil<?")
      .bind(timestamp + 60000, job.id, timestamp).run();
    if (!claim.meta.changes) continue;
    let delivered = false;
    try {
      const input: Record<string, unknown> = JSON.parse(job.payload);
      if (job.kind === "sheet") delivered = await appendSheet(env, input);
      else {
        const name = input.fullName || input.name || input.publicName;
        const subject = job.kind === "review" ? "New Ilana Care review awaiting approval" : `New ${job.kind === "booking" ? "Booking Request" : "Contact Message"} from ${name}`;
        const text = Object.entries(input).map(([key, value]) => `${key}: ${value ?? ""}`).join("\n") + (job.kind === "review" ? "\n\nReview and reply: https://ilana.care/admin" : "\n\nPlease contact the client to respond.");
        delivered = await email(env, `d1-${job.kind}-${job.recordId}`, subject, text);
      }
      if (delivered) {
        const updates = [env.DB.prepare("UPDATE notification_outbox SET sentAt=CURRENT_TIMESTAMP,leaseUntil=0 WHERE id=?").bind(job.id)];
        if (job.kind === "review") updates.push(env.DB.prepare("UPDATE reviews SET notificationSentAt=CURRENT_TIMESTAMP WHERE id=?").bind(job.recordId));
        await env.DB.batch(updates);
      }
    } catch { console.error("Notification integration unavailable", { kind: job.kind }); }
    if (!delivered) await env.DB.prepare("UPDATE notification_outbox SET leaseUntil=0,nextAttemptAt=? WHERE id=?")
      .bind(timestamp + Math.min(3600000, 60000 * 2 ** Math.min(job.attempts, 6)), job.id).run();
  }
  await env.DB.prepare("DELETE FROM submission_limits WHERE expiresAt<?").bind(timestamp).run();
}

export const d1Router = t.router({
  system: t.router({
    health: p.input(z.object({ timestamp: z.number().min(0) })).query(async ({ ctx }) => {
      await ctx.env.DB.prepare("SELECT 1 FROM bookings LIMIT 1").first();
      return { ok: true, storage: "cloudflare-d1" as const };
    }),
    notifyOwner: p.input(z.object({ title: z.string(), content: z.string() })).mutation(() => {
      throw new TRPCError({ code: "FORBIDDEN" });
    }),
  }),
  auth: t.router({
    me: p.query(() => null),
    logout: p.mutation(() => ({ success: true })),
  }),
  booking: t.router({
    getBusyTimes: p.query(async ({ ctx }) => {
      try { return await busyTimes(ctx.env); }
      catch (error) { throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: error instanceof CalendarIntegrationError ? error.message : "Calendar availability is temporarily unavailable. Please contact Ilana to confirm a time." }); }
    }),
    submit: p.input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      duration: z.number().min(2).max(10), fullName: z.string().trim().min(1).max(255), email: z.string().email().max(320),
      phone: z.string().min(1).max(50), numChildren: z.number().int().min(1).max(100), additionalInfo: z.string().max(10000).optional() }))
      .mutation(async ({ ctx, input }) => {
        await limit(ctx, "booking", 20);
        await save(ctx, "booking", "INSERT INTO bookings (date,startTime,duration,fullName,email,phone,numChildren,additionalInfo,status,createdAt) VALUES (?,?,?,?,?,?,?,?,'pending',?)",
          [input.date,input.startTime,input.duration,input.fullName,input.email,input.phone,input.numChildren,input.additionalInfo || null,now()], input);
        return { success: true };
      }),
  }),
  contact: t.router({
    submit: p.input(z.object({ name: z.string().trim().min(1).max(255), email: z.string().email().max(320), phone: z.string().min(1).max(50), message: z.string().min(1).max(10000) }))
      .mutation(async ({ ctx, input }) => {
        await limit(ctx, "contact", 20);
        await save(ctx, "contact", "INSERT INTO contacts (name,email,phone,message,createdAt) VALUES (?,?,?,?,?)", [input.name,input.email,input.phone,input.message,now()], input);
        return { success: true };
      }),
  }),
  reviews: t.router({
    list: p.query(async ({ ctx }) => {
      const { results } = await ctx.env.DB.prepare("SELECT id,publicName,rating,comment,reply,createdAt FROM reviews WHERE status='approved' ORDER BY createdAt DESC,id DESC").all<ReviewRow>();
      return results.map(row => ({ id: row.id, publicName: row.publicName, rating: row.rating, comment: row.comment, reply: row.reply, createdAt: date(row.createdAt) }));
    }),
    submit: p.input(z.object({ publicName: z.string().trim().min(1).max(80), email: z.string().trim().email().max(320), rating: z.number().int().min(1).max(5),
      comment: z.string().trim().min(1).max(3000), consent: z.literal(true), website: z.string().max(200).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (input.website) throw new TRPCError({ code: "BAD_REQUEST", message: "Unable to submit review." });
        await limit(ctx, "review", 5);
        await save(ctx, "review", "INSERT INTO reviews (publicName,email,rating,comment,status,createdAt) VALUES (?,?,?,?,'pending',?)", [input.publicName,input.email,input.rating,input.comment,now()], input);
        return { success: true };
      }),
    adminList: admin.query(async ({ ctx }) => ({
      items: (await ctx.env.DB.prepare("SELECT * FROM reviews ORDER BY createdAt DESC,id DESC").all<ReviewRow>()).results.map(review),
      emailConfigured: Boolean(ctx.env.GMAIL_APP_PASSWORD),
    })),
    moderate: admin.input(idInput.extend({ status: z.enum(["approved","rejected","pending"]) })).mutation(async ({ ctx, input }) => {
      await ctx.env.DB.prepare("UPDATE reviews SET status=? WHERE id=?").bind(input.status,input.id).run(); return { success: true };
    }),
    reply: admin.input(idInput.extend({ reply: z.string().trim().max(3000) })).mutation(async ({ ctx, input }) => {
      await ctx.env.DB.prepare("UPDATE reviews SET reply=? WHERE id=?").bind(input.reply || null,input.id).run(); return { success: true };
    }),
    remove: admin.input(idInput).mutation(async ({ ctx, input }) => {
      await ctx.env.DB.batch([ctx.env.DB.prepare("DELETE FROM notification_outbox WHERE kind='review' AND recordId=?").bind(input.id),ctx.env.DB.prepare("DELETE FROM reviews WHERE id=?").bind(input.id)]);
      return { success: true };
    }),
  }),
});
