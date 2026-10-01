# Reviews

The homepage links to `/reviews`. Visitors can submit a public display name,
1–5 star rating and written review without signing in. Submissions are stored
as pending; the public endpoint returns only approved reviews.

`/admin/reviews` accepts Google sign-in only for `Ilanadevorah25@gmail.com`.
Every admin API call verifies the signed Firebase ID token, project, issuer,
expiry, verified email and Google provider on the server. Administrators can
approve, reject, unpublish, delete and reply to reviews.

## Production configuration

Keep the existing Railway deployment, MySQL database and Resend email service.
The checked-in Drizzle migration adds the reviews table; the existing production
startup migration runner applies it.

In Firebase project `icnew-77651`, enable Authentication's Google provider and
add `ilanacares.com` (and `www.ilanacares.com` if used) to authorized domains.
The Firebase console account must have permission to manage this project; it
need not be the account used to access the reviews dashboard.

Railway must have `DATABASE_URL`, `RESEND_API_KEY` and a Resend-verified
`EMAIL_FROM`. New-review mail always goes to `Ilanadevorah25@gmail.com`,
independently of the booking/contact recipient setting. Failed mail remains
queued and is retried every minute in production; Resend idempotency keys
reduce duplicate delivery. The dashboard shows undelivered notifications and
warns when no email key is configured.

## Verification

TypeScript check, frontend/backend production builds and 19 tests passed.
Tests cover signed Google tokens, unauthorized admin calls, approved-only
public visibility, pending submissions, email failures and moderation.

After Firebase configuration and deployment, sign in as the allowed Google
account. Submit an unpublished test review, confirm email receipt, approve it,
add a public reply, check the public page and remove the test review.
