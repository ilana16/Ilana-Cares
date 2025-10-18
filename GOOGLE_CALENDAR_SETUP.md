# Google Calendar OAuth Setup Guide

This guide will help you set up Google Calendar API integration for the Ilana Cares booking system.

## Overview

The website now uses Google Calendar API to fetch your calendar availability in real-time. This requires OAuth 2.0 authentication.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Ilana Cares Calendar" and click "Create"
4. Wait for the project to be created (you'll see a notification)

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, make sure your new project is selected
2. Go to "APIs & Services" → "Library" (or click [here](https://console.cloud.google.com/apis/library))
3. Search for "Google Calendar API"
4. Click on it and click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose **External** user type (unless you have a Google Workspace account)
3. Click "Create"

**Fill in the required fields:**
- **App name:** Ilana Cares
- **User support email:** ilana.cunningham16@gmail.com
- **Developer contact email:** ilana.cunningham16@gmail.com

4. Click "Save and Continue"
5. On "Scopes" page, click "Add or Remove Scopes"
6. Search for "Google Calendar API" and select:
   - `.../auth/calendar.readonly` (View your calendars)
7. Click "Update" then "Save and Continue"
8. On "Test users" page, click "Add Users"
9. Add your email: `ilana.cunningham16@gmail.com`
10. Click "Save and Continue"
11. Review and click "Back to Dashboard"

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose **Web application**
4. Name it "Ilana Cares Web App"

**Add Authorized redirect URIs:**

For local testing:
```
http://localhost:3000/api/google/callback
```

For Railway deployment (replace with your actual Railway URL):
```
https://your-app-name.up.railway.app/api/google/callback
```

5. Click "Create"
6. **IMPORTANT:** Copy the **Client ID** and **Client Secret** - you'll need these!

## Step 5: Set Environment Variables

### For Local Development

Create a `.env` file in the project root (if it doesn't exist) and add:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

### For Railway Deployment

1. Go to your Railway project
2. Click on your service → "Variables" tab
3. Add these environment variables:
   - `GOOGLE_CLIENT_ID` = (paste your Client ID)
   - `GOOGLE_CLIENT_SECRET` = (paste your Client Secret)
   - `GOOGLE_REDIRECT_URI` = `https://your-app-name.up.railway.app/api/google/callback`

## Step 6: Authorize Your Calendar

### Local Testing

1. Start your development server: `pnpm dev`
2. Visit: http://localhost:3000/api/google/auth
3. Sign in with your Google account (ilana.cunningham16@gmail.com)
4. Grant permission to access your calendar
5. You'll be redirected to a page showing your **GOOGLE_REFRESH_TOKEN**
6. Copy this token!

### Production (Railway)

1. Deploy your app to Railway with the environment variables from Step 5
2. Visit: `https://your-app-name.up.railway.app/api/google/auth`
3. Sign in and authorize
4. Copy the **GOOGLE_REFRESH_TOKEN** from the success page
5. Go back to Railway → Variables
6. Add: `GOOGLE_REFRESH_TOKEN` = (paste the token)
7. Redeploy the application

## Step 7: Verify It's Working

1. After adding the refresh token and redeploying, check the logs
2. You should see: `[Calendar] Fetched X events from Google Calendar`
3. Visit the booking page and select a date
4. Available time slots should now reflect your actual calendar availability!

## Troubleshooting

### "Access blocked: This app's request is invalid"

**Solution:** Make sure you added your email as a test user in Step 3.

### "redirect_uri_mismatch"

**Solution:** The redirect URI in your OAuth credentials must exactly match the one in your environment variables. Check for:
- HTTP vs HTTPS
- Trailing slashes
- Port numbers (for localhost)

### "No events fetched" or empty calendar

**Possible causes:**
1. Refresh token not set correctly
2. Calendar ID is wrong (should be `ilana.cunningham16@gmail.com`)
3. No events in the next 3 months
4. Events are all-day events (these are filtered out)

**Check the logs** for error messages starting with `[Calendar]`

### "Invalid grant" error

**Solution:** Your refresh token may have expired or been revoked. Repeat Step 6 to get a new one.

## Security Notes

- **Keep your Client Secret and Refresh Token secure!** Never commit them to Git.
- The refresh token provides ongoing access to your calendar without requiring you to log in again.
- You can revoke access anytime at: https://myaccount.google.com/permissions
- The app only has **read-only** access to your calendar (cannot create/modify events)

## What Happens Next?

Once configured:
1. The booking page will fetch your calendar events every time someone visits
2. Busy times are automatically blocked out
3. A 1-hour buffer is added before and after each event
4. Only truly available slots are shown to potential clients
5. You don't need to manually update availability - it syncs automatically!

## Need Help?

If you encounter issues:
1. Check the server logs for error messages
2. Verify all environment variables are set correctly
3. Make sure the Calendar API is enabled in Google Cloud Console
4. Confirm your email is added as a test user

---

**Setup Complete!** Your calendar integration is now live and will automatically sync your availability. 🎉

