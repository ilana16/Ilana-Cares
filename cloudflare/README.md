# Ilana Care on Cloudflare D1

The `d1-cutover` branch replaces the temporary Railway API proxy with native Pages Functions and the existing `ilana-cares-staging` D1 database. The Pages project serves `ilana.care`.

## Runtime

- Frontend build: `pnpm exec vite build`; output `dist/public`.
- `wrangler.jsonc` binds `DB` to D1 `866021a6-e8ff-4c49-a18a-363a017f3f45`.
- `functions/api/[[path]].ts` serves the existing tRPC endpoints using `cloudflare/api/router.ts`.
- Customer tables and imported IDs/timestamps remain intact.
- Firebase Google ID-token verification still protects all review moderation operations. Public review responses exclude private email and unapproved content.
- Calendar failures are shown explicitly; they never turn into apparently free slots.
- Submission and notification jobs commit together. Failed email/Sheets jobs remain in D1 and retry on later API requests. The separate `ilana-care-notification-retry` Worker invokes the health endpoint every minute so retries also continue when the site is idle. It has no secrets or database access.
- Calendar responses reveal busy times, not private event titles. Sheets uses OAuth, since an API key cannot authorize a private Sheets write.
- Legacy Node/MySQL server files remain for rollback only; the Pages runtime does not import them, except the database-independent Firebase verification module.

## Before production cutover

1. Transfer existing Railway integration settings into encrypted Cloudflare Pages production variables: `GOOGLE_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, and `GOOGLE_SPREADSHEET_ID`. Set `GMAIL_APP_PASSWORD` as an encrypted Cloudflare Pages production secret using the new Gmail app password. The sender and recipient are `Ilanadevorah25@gmail.com`, using Gmail SMTP on port 587 with mandatory STARTTLS before authentication. No Resend key is used by the D1 backend. Do not transfer MySQL credentials. Never commit secrets or customer exports.
2. Apply `cloudflare/runtime.sql` to remote D1. It only adds internal queue/rate-limit tables.
3. Recheck all source MySQL rows against D1 immediately before switching. Import any newly received records without overwriting conflicts.
4. Set the Pages production branch to the tested `d1-cutover` commit and deploy. Git-triggered builds read the D1 binding from `wrangler.jsonc`.
5. Deploy `wrangler.retry.jsonc` with `pnpm exec wrangler deploy --config wrangler.retry.jsonc` to restore minute-by-minute notification retries. Verify live `system.health` reports `cloudflare-d1`, calendar availability loads, approved reviews load, unauthorized moderation fails, and a controlled test write appears in D1 rather than MySQL. Check notification delivery.
6. Leave Railway intact until live verification succeeds. The old `ilanacares.com` domain can continue receiving independent Railway writes; handle that domain separately if it should redirect to `ilana.care`.

## Local verification

Use the repository's pinned pnpm version (`10.4.1`).

```
pnpm install --frozen-lockfile
pnpm exec wrangler types --include-runtime false
pnpm exec tsc --noEmit
pnpm exec tsc --noEmit -p tsconfig.cloudflare.json
pnpm exec vitest run
pnpm exec vite build
pnpm exec wrangler d1 execute ilana-cares-staging --local --file cloudflare/schema.sql
pnpm exec wrangler d1 execute ilana-cares-staging --local --file cloudflare/runtime.sql
pnpm exec wrangler pages dev dist/public --ip 127.0.0.1 --port 8788 --inspector-port 9230
# In a second terminal, using an empty local database and no live integration secrets:
node cloudflare/verify-local.mjs
```

`verify-local.mjs` creates only local synthetic fixtures. It must not be pointed at production. Inspect the local D1 tables after it runs to check row values and notification job record IDs.
