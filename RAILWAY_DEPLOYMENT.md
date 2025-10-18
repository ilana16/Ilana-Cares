# Railway.app Deployment Guide for Ilana Cares

This guide will walk you through deploying the Ilana Cares website to Railway.app.

## Prerequisites

- Railway.app account (sign up at https://railway.app)
- GitHub account (your code is at https://github.com/ilana16/Ilana-Cares)

## Quick Start Deployment

### 1. Create Railway Account

1. Go to https://railway.app
2. Click "Login" and sign in with your GitHub account
3. Authorize Railway to access your GitHub repositories

### 2. Deploy from GitHub

1. Click "New Project" on the Railway dashboard
2. Select "Deploy from GitHub repo"
3. Choose your repository: `ilana16/Ilana-Cares`
4. Railway will automatically detect it's a Node.js project and start building

### 3. Add MySQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add MySQL"
3. Railway will provision a MySQL database
4. The `DATABASE_URL` environment variable will be automatically set

### 4. Configure Required Environment Variables

Click on your service → "Variables" tab and add:

**Minimum Required Variables:**
```
NODE_ENV=production
DATABASE_URL=(automatically set by Railway MySQL)
```

**Optional Variables (for full functionality):**

If you want to use Manus OAuth (not required for basic functionality):
```
JWT_SECRET=your-random-secret-key-here
OAUTH_SERVER_URL=https://api.manus.im
VITE_APP_ID=your-app-id
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=your-owner-id
OWNER_NAME=Ilana
```

**Note:** The website will work without OAuth - it's designed for public access (booking and contact forms don't require login).

### 5. Deploy!

1. Railway will automatically build and deploy
2. Wait 2-5 minutes for the build to complete
3. Railway will provide a public URL (e.g., `https://ilana-cares-production.up.railway.app`)
4. Click the URL to view your live website!

## Important Configuration Notes

### Email Notifications

Email credentials are currently in the code (`server/email.ts`):
- **Gmail:** ilana.cunningham16@gmail.com
- **App Password:** zipe yywl pfwh acbw (remove spaces when using)

These will work as-is. For better security in production:
1. Add environment variables: `GMAIL_USER` and `GMAIL_APP_PASSWORD`
2. Update `server/email.ts` to use these variables

### Google Calendar Integration

The app now uses Google Calendar API with OAuth for real-time availability.

**Setup required:**
1. Follow the detailed instructions in `GOOGLE_CALENDAR_SETUP.md`
2. Add these environment variables to Railway:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (e.g., `https://your-app.up.railway.app/api/google/callback`)
   - `GOOGLE_REFRESH_TOKEN` (obtained after OAuth authorization)

**Without these variables:** The booking system will still work, but won't filter out busy times from your calendar.

### Firebase Analytics

Firebase configuration is in `client/src/lib/firebase.ts` and will work automatically.

### Payment Information

Bit/Paybox number (0505298803) is in `client/src/pages/Payment.tsx`.

## Testing Your Deployment

After deployment, test these features:

1. ✅ **Home Page** - Should load with navigation buttons
2. ✅ **About Page** - Shows Ilana's bio and certifications
3. ✅ **Rates Page** - Displays pricing information
4. ✅ **Booking Page** - Calendar integration and form submission
5. ✅ **Payment Page** - Shows Bit/Paybox information
6. ✅ **Contact Page** - Contact form submission

## Troubleshooting

### Build Fails

**Check the logs:**
1. Go to your service in Railway
2. Click "Deployments" → Latest deployment → "View Logs"
3. Look for error messages

**Common issues:**
- Missing `DATABASE_URL` - Make sure MySQL is added and connected
- Build timeout - Railway free tier has build limits, upgrade if needed

### Application Crashes

**Check application logs:**
1. Click on your service → "Logs"
2. Look for runtime errors

**Common fixes:**
- Database connection: Verify `DATABASE_URL` is correct
- Port binding: Railway sets `PORT` automatically, don't override it

### Database Issues

**Run migrations:**
The app should auto-create tables on first run. If not:
1. Go to your MySQL database in Railway
2. Click "Query" tab
3. Run the SQL from your schema manually, or
4. Use Railway's CLI to run `pnpm db:push`

### Email Not Sending

- Verify Gmail App Password is correct (no spaces)
- Check Gmail account settings allow SMTP access
- Look for SMTP errors in application logs

## Custom Domain (Optional)

To use your own domain (e.g., `ilanacares.com`):

1. In Railway, go to your service → "Settings"
2. Scroll to "Domains" section
3. Click "Custom Domain"
4. Enter your domain name
5. Update your DNS records:
   - Add a CNAME record pointing to Railway's domain
   - Or add A records to Railway's IP addresses
6. Wait for DNS propagation (5-60 minutes)

## Cost Estimate

**Railway Pricing (as of 2025):**
- **Hobby Plan**: $5 credit/month (free tier) - good for testing
- **Pro Plan**: $20/month + usage

**Expected costs for this app:**
- Small traffic: $5-10/month (Hobby plan credit may cover it)
- Moderate traffic: $10-20/month
- Database: Included in usage

**Tip:** Start with the Hobby plan. Railway shows real-time usage, so you can monitor costs.

## Monitoring & Maintenance

### View Metrics

Railway provides built-in monitoring:
1. Go to your service → "Metrics"
2. View CPU, Memory, Network usage
3. Set up alerts for high usage

### View Logs

Real-time logs are available:
1. Click on your service → "Logs"
2. Filter by time range or search for specific errors
3. Download logs for analysis

### Database Backups

**Important:** Railway's free tier doesn't include automatic backups.

**Manual backup:**
1. Go to MySQL database → "Data" tab
2. Export data regularly
3. Or use Railway CLI to dump database

**For production:** Upgrade to a paid plan with automatic backups.

## Security Recommendations

Before going live with real customers:

1. **Move secrets to environment variables:**
   - Gmail credentials
   - Any API keys
   - Database passwords

2. **Enable HTTPS:** Railway provides this automatically

3. **Set up monitoring:** Use Railway's alerts for downtime

4. **Regular backups:** Export database weekly

5. **Update dependencies:** Run `pnpm update` regularly

## Next Steps

✅ **Deployment Complete!**

Now you can:
1. Share your Railway URL with clients
2. Add a custom domain
3. Monitor bookings via email notifications
4. Check database for booking records

## Support

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **GitHub Issues:** https://github.com/ilana16/Ilana-Cares/issues

---

**Need help?** Contact ilana.cunningham16@gmail.com

**Deployed successfully?** Start accepting bookings! 🎉

