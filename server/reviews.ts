import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { reviews } from "../drizzle/schema";
import { requireReviewAdmin } from "./reviewAuth";
import { sendReviewEmail } from "./email";

async function database() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Reviews are temporarily unavailable. Please try again later.",
    });
  return db;
}
const tokenInput = z.object({ token: z.string().min(1).max(10000) });
const admin = publicProcedure.input(tokenInput).use(async ({ input, next }) => {
  await requireReviewAdmin(input.token);
  return next();
});
const attempts = new Map<string, { count: number; until: number }>();
function limitSubmissions(ip: string) {
  const now = Date.now();
  attempts.forEach((value, key) => {
    if (value.until <= now) attempts.delete(key);
  });
  const previous = attempts.get(ip);
  if (previous && previous.count >= 5)
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Please wait before submitting another review.",
    });
  if (!previous && attempts.size >= 10000)
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Please try again later.",
    });
  attempts.set(ip, {
    count: (previous?.count ?? 0) + 1,
    until: previous?.until ?? now + 60 * 60 * 1000,
  });
}
let notifying = false;
export async function retryReviewNotifications() {
  if (notifying || !process.env.DATABASE_URL) return;
  notifying = true;
  try {
    const db = await database();
    const pending = await db
      .select()
      .from(reviews)
      .where(isNull(reviews.notificationSentAt))
      .limit(20);
    for (const review of pending) {
      if (await sendReviewEmail(review))
        await db
          .update(reviews)
          .set({ notificationSentAt: new Date() })
          .where(
            and(eq(reviews.id, review.id), isNull(reviews.notificationSentAt))
          );
    }
  } catch {
    console.error("[Reviews] Notification retry failed");
  } finally {
    notifying = false;
  }
}
export const reviewsRouter = router({
  list: publicProcedure.query(async () =>
    (await database())
      .select({
        id: reviews.id,
        publicName: reviews.publicName,
        rating: reviews.rating,
        comment: reviews.comment,
        reply: reviews.reply,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(eq(reviews.status, "approved"))
      .orderBy(desc(reviews.createdAt))
  ),
  submit: publicProcedure
    .input(
      z.object({
        publicName: z.string().trim().min(1).max(80),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().min(1).max(3000),
        consent: z.literal(true),
        website: z.string().max(200).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.website)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unable to submit review.",
        });
      limitSubmissions(ctx.req.ip ?? ctx.req.socket.remoteAddress ?? "unknown");
      const db = await database();
      const result = await db
        .insert(reviews)
        .values({
          publicName: input.publicName,
          rating: input.rating,
          comment: input.comment,
          status: "pending",
        });
      const id = result[0].insertId;
      if (await sendReviewEmail({ id, ...input })) {
        await db
          .update(reviews)
          .set({ notificationSentAt: new Date() })
          .where(eq(reviews.id, id))
          .catch(() =>
            console.error(
              "[Reviews] Could not record email delivery; retry queued"
            )
          );
      }
      return { success: true };
    }),
  adminList: admin.query(async () => ({
    items: await (await database())
      .select()
      .from(reviews)
      .orderBy(desc(reviews.createdAt)),
    emailConfigured: Boolean(process.env.RESEND_API_KEY),
  })),
  moderate: admin
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["approved", "rejected", "pending"]),
      })
    )
    .mutation(async ({ input }) => {
      await (await database())
        .update(reviews)
        .set({ status: input.status })
        .where(eq(reviews.id, input.id));
      return { success: true };
    }),
  reply: admin
    .input(
      z.object({
        id: z.number().int().positive(),
        reply: z.string().trim().max(3000),
      })
    )
    .mutation(async ({ input }) => {
      await (
        await database()
      )
        .update(reviews)
        .set({ reply: input.reply || null })
        .where(eq(reviews.id, input.id));
      return { success: true };
    }),
  remove: admin
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await (await database()).delete(reviews).where(eq(reviews.id, input.id));
      return { success: true };
    }),
});
