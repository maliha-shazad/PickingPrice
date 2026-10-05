# Picking Price account setup

Email/password registration and login use D1 accounts, salted scrypt password hashes, opaque server-side sessions, secure HttpOnly cookies, origin checks, and per-email/IP attempt limits. A buyer/seller selection is a preference, not an administrator entitlement. Passwords must have 12–128 characters. Sessions expire in seven days. Sign-out revokes the current session.

Existing workspace-owned marketplace records remain under their original identity. Creating an email or Google account creates a separate identity and does not move those records. The Site remains owner-private; application registration does not grant access through the Sites sharing gate.

## Enable Google sign-up

1. Create a Web application OAuth client in Google Cloud and configure the consent screen.
2. Add this exact authorized redirect URI:
   `https://picking-price.ahsanjaved-it.chatgpt.site/api/auth/google/callback`
3. Set `GOOGLE_CLIENT_ID` and secret `GOOGLE_CLIENT_SECRET` using the Site's hosted environment settings. Do not place the secret in frontend code or commit it.
4. Redeploy and test with an allowed Google test user, then publish the Google consent app as appropriate.

The button enables only when both values are configured. Until then, the UI clearly states that Google sign-up is unavailable. The OAuth code flow uses one-time state bound to an HttpOnly browser cookie, PKCE, server-side token exchange, and Google's HTTPS userinfo endpoint. Only verified Google email identities are accepted. Access tokens are not stored. Existing password accounts are never automatically linked by matching email.

## Administrator access

The admin panel is a separate page at `/admin` with its own sign-in. Nothing in the marketplace links to it, and a marketplace account never has administrator rights, whatever its stored role.

There is exactly one administrator. It is not a marketplace account: its email and scrypt password hash live in a single-row `admin_auth` table with their own `admin_sessions` (12-hour, HttpOnly, SameSite=Strict cookie), so member sign-up, sign-in and password reset cannot create or take over the administrator.

Creating the administrator (once):

- Hosted and local Worker edition: set the secret `ADMIN_SETUP_CODE` (16 characters or more), open `/admin`, and enter that code with the email and password you want. For local development put it in a project-root `.dev.vars` file; `pnpm start` copies it beside the built Worker config. Once the administrator exists the code can no longer be used, and with no code set, setup is switched off.
- Portable Express edition: either set `ADMIN_SETUP_CODE` the same way, or run `pnpm admin:postgres` with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

The password (12–128 characters) is changed inside the panel with **Change password**, which signs out every other admin session. There is no forgotten-password flow for the administrator: if that password is lost, someone with database access must delete the row in `admin_auth` and run setup again. Sign-in, setup and password attempts are limited per IP address.

## Remaining account features

Email confirmation, MFA and user-managed account linking are not implemented, and no email is ever sent. Email/password addresses are not marked verified.

## Forgotten passwords

Because there is no email delivery, a member cannot reset a password with an email address alone. The member contacts support; the administrator confirms who they are, opens `/admin` → Members → **Reset password**, and reads out the one-time code shown. The member enters that code with their email and a new password on the Forgot Password page. A code is valid for 60 minutes and for one use, issuing a new one cancels the previous one, and a successful reset signs the member out everywhere else. Issued codes appear in the admin Activity log.

## Checks

Use `pnpm test:password` for password checks. Type-check and build before publication. Run `pnpm test:auth` after building for Worker-runtime integration checks. These use an isolated disposable database; no test accounts are seeded to production.
