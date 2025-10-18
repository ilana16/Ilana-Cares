import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createBooking, createContact } from "./db";
import { sendBookingEmail, sendContactEmail } from "./email";
import { fetchBusyTimes } from "./calendar";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  booking: router({
    getBusyTimes: publicProcedure.query(async () => {
      const busyTimes = await fetchBusyTimes();
      return busyTimes;
    }),
    
    submit: publicProcedure
      .input(
        z.object({
          date: z.string(),
          startTime: z.string(),
          duration: z.number().min(2).max(10),
          fullName: z.string().min(1),
          email: z.string().email(),
          phone: z.string().min(1),
          numChildren: z.number().min(1),
          additionalInfo: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Save to database
        await createBooking({
          date: input.date,
          startTime: input.startTime,
          duration: input.duration,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          numChildren: input.numChildren,
          additionalInfo: input.additionalInfo || null,
        });

        // Send email notification
        await sendBookingEmail(input);

        return { success: true };
      }),
  }),

  contact: router({
    submit: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          phone: z.string().min(1),
          message: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        // Save to database
        await createContact({
          name: input.name,
          email: input.email,
          phone: input.phone,
          message: input.message,
        });

        // Send email notification
        await sendContactEmail(input);

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

