# Picking Price

Fixed-price listings and buyer requests for new and pre-loved products in Pakistan. Includes accounts, roles, uploads, search, wishlists, messages, reviews, profiles, seller offers/selection, quotas, manual service-payment approvals, promotions, notifications and administration. Product payments, delivery, orders, wallets, auctions and AI remain excluded.

## Editions

- Hosted Site: React/Vinext, Workers, D1 and R2, with a private Site access policy. The administrator signs in separately at `/admin` (see AUTH_SETUP.md).
- Portable FYP edition: React, Node.js, Express and PostgreSQL with the same domain services. Uploaded photos use a persistent filesystem directory.

The hosted Site does not run Express/PostgreSQL. PGlite integration tests provide local PostgreSQL coverage; deployment to an external PostgreSQL host has not been performed.

## Portable setup

Use Node.js 22.13+ and the pnpm version in package.json. Install with the lockfile, then run `pnpm build:postgres`.

Set process environment variables: `DATABASE_URL`, exact browser origin `APP_ORIGIN`, optionally `PORT` (3000), `UPLOADS_DIR` (server/uploads), and `PGSSL=require` for verified PostgreSQL TLS. Run `pnpm start:postgres`. Migrations run before startup. Use HTTPS through one trusted reverse proxy in production and retain both PostgreSQL and uploaded media in durable storage.

To create a new administrator, set DATABASE_URL, ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 16 characters, then run `pnpm admin:postgres`. It creates the single administrator and changes nothing if one already exists. Remove the password environment variable afterward. The administrator signs in at `/admin`, not through the member login.

## Owner configuration

Enter actual payment instructions in the admin panel (`/admin`) → Settings. The default allowance is 25 slots and extra slots cost Rs. 50. Administrators can change limits, prices, three promotion durations, placement and categories. Only approved manual payments activate services.

Google signup requires GOOGLE_CLIENT_ID and secret GOOGLE_CLIENT_SECRET, with the callback APP_ORIGIN/api/auth/google/callback. See AUTH_SETUP.md. No real OAuth credentials are currently configured. Email verification/reset remains an optional unimplemented extension and is not advertised as available.

## Verification

- `pnpm exec tsc --noEmit`
- `pnpm test:market`: shared domain tests against PGlite and D1, including boundaries, permissions and concurrent D1 operations.
- `pnpm test:password`: password hashing and verification.
- Build the hosted Worker, then `pnpm test:auth`: Worker routes, sessions, invalid requests and R2 uploads.
- `pnpm build:postgres` then `pnpm test:http`: real Express HTTP requests with embedded PostgreSQL.
- `pnpm lint`: strict static checks; known current findings are recorded in REQUIREMENTS_AUDIT.md.

All automated tests use disposable local data, not real production accounts or transfers. See REQUIREMENTS_AUDIT.md for evidence and pending acceptance checks.

## Maintenance

Domain services are in lib/market; UI in app/market; hosted adapters in app/api; Express/PostgreSQL in server. Applied drizzle migrations are immutable; append new migrations for schema changes. Legacy records are retained, and imports needing review remain available to administrators.
