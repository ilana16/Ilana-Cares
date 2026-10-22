# Cloudflare staging

This branch deploys to `ilana-cares-staging.pages.dev` using Cloudflare Pages.

- Build: `pnpm exec vite build`
- Output: `dist/public`
- Domain `ilana.care` is **not** cut over yet.
- `functions/api/[[path]].ts` temporarily forwards API requests to Railway. This is not a Railway exit.
- D1 staging schema: `schema.sql`; customer data is not in this repository.
- Do not merge this branch to master or stop existing hosts until tests and data backup pass.
