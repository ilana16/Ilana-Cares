import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createBooking, createContact } from "./db";
import { notifyOwner } from "./_core/notification";
import { fetchBusyTimes } from "./calendar";
import { appendBookingToSheet } from "./sheets";
import { sendBookingEmail, sendContactEmail } from "./email";

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

        // Format date for notification
        const formattedDate = new Date(input.date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          timeZone: 'Asia/Jerusalem'
        });

        // Send notification to project owner
        const notificationContent = `
New Booking Request

Booking Details:
• Date: ${formattedDate}
• Start Time: ${input.startTime}
• Duration: ${input.duration} hours
• Number of Children: ${input.numChildren}

Contact Information:
• Name: ${input.fullName}
• Email: ${input.email}
• Phone/WhatsApp: ${input.phone}

${input.additionalInfo ? `Additional Information:\n${input.additionalInfo}\n\n` : ''}
Please contact the client to confirm the booking.
        `.trim();

        await notifyOwner({
          title: `New Booking Request from ${input.fullName}`,
          content: notificationContent,
        }).catch(err => console.error('[Booking] Notification failed:', err));

        // Send email notification
        await sendBookingEmail({
          date: input.date,
          startTime: input.startTime,
          duration: input.duration,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          numChildren: input.numChildren,
          additionalInfo: input.additionalInfo,
        }).catch(err => console.error('[Booking] Email notification failed:', err));

        // Add to Google Sheets (non-blocking)
        appendBookingToSheet({
          parentName: input.fullName,
          parentEmail: input.email,
          parentPhone: input.phone,
          childName: `${input.numChildren} child(ren)`,
          childAge: 'N/A',
          date: input.date,
          startTime: input.startTime,
          duration: input.duration,
          specialRequests: input.additionalInfo,
          timestamp: new Date(),
        }).catch(err => console.error('[Booking] Sheets integration failed:', err));

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

        // Send notification to project owner
        const notificationContent = `
New Contact Message

Contact Information:
• Name: ${input.name}
• Email: ${input.email}
• Phone/WhatsApp: ${input.phone}

Message:
${input.message}

Please respond to this inquiry as soon as possible.
        `.trim();

        await notifyOwner({
          title: `New Contact Message from ${input.name}`,
          content: notificationContent,
        }).catch(err => console.error('[Contact] Notification failed:', err));

        // Send email notification
        await sendContactEmail({
          name: input.name,
          email: input.email,
          phone: input.phone,
          message: input.message,
        }).catch(err => console.error('[Contact] Email notification failed:', err));

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

