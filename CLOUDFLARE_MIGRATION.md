# Ilana Cares — Cloudflare migration plan (staging, do not merge yet)

## Source and scope
- **Source repository:** `ilana16/Ilana-Cares`; live Vercel and Railway deploy from `master`.
- **Migration branch:** `cloudflare-migration`. Do not merge until full functional testing.
- **Old site:** `ilanacares.com` and `www.ilanacares.com` remain live.
- **New registrar domain:** `ilana.care`, registered at Namecheap. Cloudflare DNS zone pending nameserver delegation.
- **Current Railway:** project `exciting-light`, production service `Ilana-Cares` plus MySQL 9 on a persistent volume.

## Target architecture
1. Cloudflare Pages hosts the existing Vite/React frontend, built from this GitHub repo.
2. On preview only, `functions/api/[[path]].ts` proxies the existing API to Railway so bookings keep working during testing. **This is transitional and is NOT a completed Railway exit.**
3. Migrate the Node/Express/tRPC backend to Cloudflare Workers with `nodejs_compat`, without altering the client API contract.
4. Migrate MySQL data to D1 (SQLite). `cloudflare/schema.sql` is a staging-only initial schema based on the current Drizzle table definitions. Convert `drizzle-orm/mysql2` and `drizzle-orm/mysql-core` to D1/SQLite and update all affected queries before removing Railway.
5. Move email/Resend, Google Calendar and Google Sheets integrations into Cloudflare Worker secrets/bindings. Replace in-process `setInterval` retry loops with a Cloudflare Cron Trigger and durable retry storage. Keep Firebase-authenticated reviews moderation.
6. Replace the Pages proxy with native Cloudflare API routing (or consolidate frontend/API into one Worker). Test before public DNS cutover.
7. Switch new domain `ilana.care` to Cloudflare after DNS records (especially MX/SPF/DKIM/DMARC) have been audited. Keep `ilanacares.com` active or redirect it only after both domains and booking flows are verified.
8. After verified backups and cutover, separately approve decommissioning Railway/Vercel.

## Cloudflare preview build settings
- Production branch for this *preview Cloudflare project only*: `cloudflare-migration` (avoid triggering the old hosts).
- Build command: `pnpm exec vite build`.
- Build output: `dist/public`.
- Root: repository root.
- Node 22 / pnpm 10.x.
- Function route: `/api/*` is temporarily proxied to existing Railway backend.

## Required safeguards
- Database content is **not** stored in GitHub. Export full MySQL backup with all tables, preserve primary keys, check table counts and sampled records; then import data privately into D1 and recheck counts.
- Freeze writes or replay any changes occurring between last copy and DNS cutover to avoid losing bookings.
- Check Google Calendar busy times using authorized access; failed calendar access must **not** display all time slots as free.
- The current repository's documentation contains an exposed Gmail app password and private calendar-feed URL. **Revoke/rotate both**; Git history may still retain earlier secret strings.
- Do not trust API keys for private Google Sheets writes; confirm OAuth/scoped service authorization.
- Validate Firebase review admin access, email notifications, spam and rate limiting, all booking forms and Google Sheet writes.
- Confirm old booking links and new domain HTTPS certificates, plus 301 redirects after cutover.
- Do not delete the MySQL volume until both SQL backup and D1 restoration are verified.

## Current blockers before full cutover
- The connected Railway OAuth scope reveals environment-variable names only, not secret values.
- A separate secure, authenticated MySQL export/import is needed; no customer data has been moved yet.
- Namecheap nameservers must be updated in the registrar dashboard.
- Workers runtime compatibility and all integrations require testing.
