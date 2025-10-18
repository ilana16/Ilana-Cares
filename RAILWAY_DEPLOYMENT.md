# Railway.app Deployment Guide for Ilana Cares

This guide will walk you through deploying the Ilana Cares website to Railway.app.

## Prerequisites

- Railway.app account (sign up at https://railway.app)
- GitHub account (your code is already pushed to https://github.com/ilana16/Ilana-Cares)
- MySQL database (Railway provides this)

## Step-by-Step Deployment

### 1. Create Railway Account

1. Go to https://railway.app
2. Click "Login" and sign in with your GitHub account
3. Authorize Railway to access your GitHub repositories

### 2. Create New Project

1. Click "New Project" on the Railway dashboard
2. Select "Deploy from GitHub repo"
3. Choose your repository: `ilana16/Ilana-Cares`
4. Railway will automatically detect it's a Node.js project

### 3. Add MySQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add MySQL"
3. Railway will provision a MySQL database and automatically set the `DATABASE_URL` environment variable

### 4. Configure Environment Variables

Click on your service → "Variables" tab and add these environment variables:

**Required Variables (Already Auto-Injected by Manus Platform):**
- `DATABASE_URL` - (Automatically set by Railway MySQL)
- `NODE_ENV` - Set to `production`
- `PORT` - Set to `3000` (or leave empty, Railway auto-assigns)

**Platform Variables (Copy from Manus):**
These are already configured in your Manus project but need to be added to Railway:

```
JWT_SECRET=<your-jwt-secret>
OAUTH_SERVER_URL=https://api.manus.im
VITE_APP_ID=<your-app-id>
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=<your-owner-id>
OWNER_NAME=<your-name>
VITE_APP_TITLE=Ilana Cares
VITE_APP_LOGO=https://your-logo-url.com/logo.png
BUILT_IN_FORGE_API_URL=<your-forge-api-url>
BUILT_IN_FORGE_API_KEY=<your-forge-api-key>
VITE_ANALYTICS_ENDPOINT=<your-analytics-endpoint>
VITE_ANALYTICS_WEBSITE_ID=<your-analytics-id>
```

**Note:** The Gmail password and Firebase API key are currently hardcoded in the source files. For production, you should move these to environment variables.

### 5. Deploy

1. Railway will automatically start building and deploying
2. Wait for the build to complete (usually 2-5 minutes)
3. Once deployed, Railway will provide a public URL (e.g., `https://ilana-cares-production.up.railway.app`)

### 6. Run Database Migrations

After the first deployment:

1. Go to your service in Railway
2. Click on the "..." menu → "View Logs"
3. The database tables should be automatically created on first run
4. If not, you may need to run: `pnpm db:push` (Railway provides a way to run commands)

### 7. Test Your Deployment

1. Visit your Railway URL
2. Test all pages:
   - Home page
   - About Ilana
   - Rates
   - Booking (check calendar integration)
   - Payment Options
   - Contact form

### 8. Custom Domain (Optional)

To use your own domain:

1. In Railway, go to your service → "Settings"
2. Scroll to "Domains"
3. Click "Custom Domain"
4. Follow the instructions to add your domain
5. Update your DNS records as instructed

## Important Notes

### Email Configuration

The Gmail SMTP credentials are currently hardcoded in `server/email.ts`:
- Email: `ilana.cunningham16@gmail.com`
- App Password: `zipe yywl pfwh acbw` (remove spaces)

**Security Recommendation:** Move these to environment variables:
1. Add `GMAIL_USER` and `GMAIL_APP_PASSWORD` to Railway environment variables
2. Update `server/email.ts` to use `process.env.GMAIL_USER` and `process.env.GMAIL_APP_PASSWORD`

### Firebase Configuration

Firebase credentials are in `client/src/lib/firebase.ts`. These are safe to keep in the code as they're meant to be public (with proper Firebase security rules).

### Calendar Integration

The Google Calendar .ics URL is in `server/calendar.ts`. This is a private calendar URL, so keep it secure.

### Database Backups

Railway provides automatic backups for paid plans. For the free tier:
1. Regularly export your database
2. Consider upgrading to a paid plan for production use

## Troubleshooting

### Build Fails

- Check the build logs in Railway
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Database Connection Issues

- Verify `DATABASE_URL` is set correctly
- Check database logs in Railway
- Ensure database is running

### Application Crashes

- Check application logs in Railway
- Verify all environment variables are set
- Check for missing dependencies

### Email Not Sending

- Verify Gmail App Password is correct (no spaces)
- Check if Gmail account has "Less secure app access" enabled (or use App Password)
- Check application logs for SMTP errors

## Cost Estimate

**Railway Pricing:**
- **Hobby Plan (Free)**: $5 credit/month, good for testing
- **Developer Plan**: $5/month + usage (~$10-20/month total for this app)
- **Team Plan**: $20/month + usage

For a production babysitting website with moderate traffic, expect around $10-15/month.

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: https://github.com/ilana16/Ilana-Cares/issues

## Next Steps After Deployment

1. **Test thoroughly** - Try booking, contact forms, etc.
2. **Set up monitoring** - Use Railway's built-in metrics
3. **Configure backups** - Export database regularly
4. **Add custom domain** - Use your own domain name
5. **Update OAuth redirect URLs** - If using Manus OAuth, update allowed callback URLs
6. **Monitor costs** - Keep an eye on Railway usage

---

**Deployed successfully?** Share your Railway URL and start accepting bookings! 🎉

