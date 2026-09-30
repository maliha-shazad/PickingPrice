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

## Remaining account features

Email confirmation, forgotten-password delivery, MFA and user-managed account linking are not implemented. Email/password addresses are not marked verified. The registration screen discloses that email recovery is unavailable.

## Checks

Use `pnpm test:password` for password checks. Type-check and build before publication. Run `pnpm test:auth` after building for Worker-runtime integration checks. These use an isolated disposable database; no test accounts are seeded to production.
