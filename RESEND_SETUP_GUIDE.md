# Resend Email Integration Setup Guide

## Overview

Your Ilana Cares application has been successfully integrated with **Resend**, a modern email API service that provides better deliverability and easier configuration compared to traditional SMTP services.

## What Changed

### Files Modified

1. **`server/email.ts`** - Completely rewritten to use Resend SDK instead of nodemailer
2. **`server/routers.ts`** - Updated to send email notifications for bookings and contact form submissions
3. **`.env.example`** - Added Resend configuration variables
4. **`package.json`** - Added `resend` dependency (v6.2.0)

### Key Features

- **Dual Notification System**: The app now sends notifications through both:
  - Manus Notification Service (existing)
  - Resend Email (new)
- **Non-blocking**: Email sending happens asynchronously and won't block the user experience if it fails
- **Error Handling**: Comprehensive error logging for troubleshooting

## Setup Instructions

### Step 1: Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Click **"Get Started"** or **"Sign Up"**
3. Create an account using your email address
4. Verify your email address

### Step 2: Create an API Key

1. Once logged in, navigate to **API Keys** in the dashboard
2. Click **"Create API Key"**
3. Give it a name (e.g., "Ilana Cares Production")
4. Select the appropriate permissions:
   - **Sending access** (required)
   - **Domain access** (optional, for domain management)
5. Click **"Create"**
6. **IMPORTANT**: Copy the API key immediately - it starts with `re_` and you won't be able to see it again
7. Store it securely (you'll need it in the next step)

### Step 3: Verify Your Domain (Recommended for Production)

For production use, you should verify your own domain to send emails from your custom email address (e.g., `noreply@ilanacares.com`).

#### Option A: Use Your Own Domain (Recommended)

1. In the Resend dashboard, go to **Domains**
2. Click **"Add Domain"**
3. Enter your domain name (e.g., `ilanacares.com`)
4. Follow the instructions to add DNS records:
   - **SPF Record** (TXT)
   - **DKIM Record** (TXT)
   - **DMARC Record** (TXT) - optional but recommended
5. Wait for DNS propagation (usually 5-15 minutes, can take up to 48 hours)
6. Click **"Verify DNS Records"** in the Resend dashboard
7. Once verified, you can send emails from any address at your domain

#### Option B: Use Resend's Test Domain (Development Only)

For testing purposes, you can use Resend's default domain:
- **From Address**: `onboarding@resend.dev`
- **Limitation**: Can only send to verified email addresses in your Resend account
- **Not recommended for production**

### Step 4: Configure Environment Variables

You need to add the following environment variables to your deployment environment (Railway, Vercel, etc.):

#### Required Variables

```bash
RESEND_API_KEY=re_your_actual_api_key_here
```

#### Optional Variables (with defaults)

```bash
# The "From" address for outgoing emails
# Default: "Ilana Cares <onboarding@resend.dev>"
# Production example: "Ilana Cares <noreply@ilanacares.com>"
EMAIL_FROM=Ilana Cares <noreply@yourdomain.com>

# The recipient address for notifications
# Default: ilana.cunningham16@gmail.com
EMAIL_TO=ilana.cunningham16@gmail.com
```

#### How to Set Environment Variables

**For Railway (your current deployment platform):**

1. Go to your Railway project dashboard
2. Select your service
3. Go to the **Variables** tab
4. Click **"New Variable"**
5. Add each variable:
   - Variable: `RESEND_API_KEY`
   - Value: `re_your_actual_api_key_here`
6. Click **"Add"**
7. Repeat for `EMAIL_FROM` and `EMAIL_TO` if you want to customize them
8. Railway will automatically redeploy your application

**For Local Development:**

1. Create a `.env` file in the project root (if it doesn't exist)
2. Add the variables:
   ```bash
   RESEND_API_KEY=re_your_actual_api_key_here
   EMAIL_FROM=Ilana Cares <onboarding@resend.dev>
   EMAIL_TO=ilana.cunningham16@gmail.com
   ```
3. The `.env` file is already in `.gitignore`, so it won't be committed to Git

### Step 5: Deploy and Test

1. **Commit the changes** to your Git repository:
   ```bash
   git add .
   git commit -m "Integrate Resend for email notifications"
   git push origin main
   ```

2. **Deploy** (if using Railway, this happens automatically after push)

3. **Test the integration**:
   - Submit a test booking through your website
   - Submit a test contact form message
   - Check your email inbox (the address specified in `EMAIL_TO`)
   - Check the application logs for any errors

### Step 6: Monitor Email Delivery

1. Log in to your Resend dashboard
2. Go to **Emails** to see all sent emails
3. You can view:
   - Delivery status
   - Open rates (if tracking is enabled)
   - Click rates
   - Bounce/complaint reports

## Troubleshooting

### Email Not Received

**Check 1: Verify API Key**
- Make sure `RESEND_API_KEY` is set correctly in your environment variables
- The key should start with `re_`
- Check application logs for error messages

**Check 2: Check Spam Folder**
- Emails might be filtered to spam, especially if using the test domain
- Mark as "Not Spam" to train your email provider

**Check 3: Verify Domain**
- If using your own domain, ensure DNS records are properly configured
- Use Resend's dashboard to verify domain status

**Check 4: Check Resend Dashboard**
- Log in to Resend and check the **Emails** section
- Look for failed deliveries or error messages

**Check 5: Review Application Logs**
- Check your Railway logs for email-related errors
- Look for lines starting with `[Email]`

### Common Error Messages

**"Resend API key not configured"**
- Solution: Add `RESEND_API_KEY` to your environment variables

**"Domain not verified"**
- Solution: Either use `onboarding@resend.dev` for testing, or complete domain verification

**"Invalid API key"**
- Solution: Double-check that you copied the entire API key correctly

## Email Templates

The integration includes two email templates:

### 1. Booking Notification Email
Sent when a customer submits a booking request. Contains:
- Booking date, time, and duration
- Number of children
- Customer contact information
- Additional notes (if provided)

### 2. Contact Form Email
Sent when someone uses the contact form. Contains:
- Sender's name, email, and phone
- Message content

Both templates use HTML formatting for better readability.

## Cost Considerations

Resend pricing (as of October 2024):

- **Free Tier**: 3,000 emails/month, 100 emails/day
- **Pro Tier**: $20/month for 50,000 emails, then $1 per 1,000 additional emails
- **Enterprise**: Custom pricing for high-volume senders

For a small childcare business, the free tier should be more than sufficient.

## Security Best Practices

1. **Never commit API keys** to Git - they're in `.env` which is gitignored
2. **Use environment variables** for all sensitive configuration
3. **Rotate API keys** periodically (every 3-6 months)
4. **Monitor usage** in the Resend dashboard to detect any unusual activity
5. **Use domain verification** in production for better deliverability and security

## Additional Features (Optional)

### React Email Templates

For more advanced email designs, you can integrate React Email:

1. Install React Email:
   ```bash
   pnpm add @react-email/components
   ```

2. Create email templates as React components
3. Render them to HTML and pass to Resend

See: [https://react.email/docs/integrations/resend](https://react.email/docs/integrations/resend)

### Email Scheduling

Resend supports scheduled emails:

```typescript
await resend.emails.send({
  from: 'Ilana Cares <noreply@ilanacares.com>',
  to: 'customer@example.com',
  subject: 'Booking Reminder',
  html: '<p>Your booking is tomorrow!</p>',
  scheduledAt: '2024-10-20T09:00:00Z', // ISO 8601 format
});
```

### Email Attachments

You can send attachments (e.g., booking confirmations as PDFs):

```typescript
await resend.emails.send({
  from: 'Ilana Cares <noreply@ilanacares.com>',
  to: 'customer@example.com',
  subject: 'Booking Confirmation',
  html: '<p>Thank you for your booking!</p>',
  attachments: [
    {
      filename: 'booking-confirmation.pdf',
      content: pdfBuffer, // Buffer or base64 string
    },
  ],
});
```

## Support Resources

- **Resend Documentation**: [https://resend.com/docs](https://resend.com/docs)
- **Resend API Reference**: [https://resend.com/docs/api-reference](https://resend.com/docs/api-reference)
- **Resend Support**: [support@resend.com](mailto:support@resend.com)
- **Resend Discord**: [https://resend.com/discord](https://resend.com/discord)

## Next Steps

1. ✅ Create Resend account
2. ✅ Generate API key
3. ✅ Verify domain (or use test domain)
4. ✅ Add environment variables to Railway
5. ✅ Deploy and test
6. ✅ Monitor email delivery

If you encounter any issues during setup, check the troubleshooting section or review the application logs for specific error messages.

