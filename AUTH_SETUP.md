# Picking Price account setup

## Member accounts

Members register and sign in with an email address (or phone number) and a password of 8 to 128 characters. Passwords are stored only as salted scrypt hashes. A sign-in creates a server-side session kept in a secure, HttpOnly cookie; it expires after seven days and signing out ends it immediately. Sign-up, sign-in and reset attempts are limited per email address and per IP address, and every form request is checked against the site's own origin.

The role chosen at sign-up (buying, selling, or both) only decides which features the member sees first. It can be changed later in the profile, and it never gives administrator rights.

## Google sign-in

1. In Google Cloud, create an OAuth client of type **Web application** and configure the consent screen.
2. Add this authorized redirect URI, using your own site address:
   `https://YOUR-DOMAIN/api/auth/google/callback`
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as environment variables on the server. Never put the secret in frontend code or commit it.
4. Redeploy, test with a Google test user, then publish the consent screen.

The Google button is enabled only when both values are set. The flow uses a one-time state value tied to an HttpOnly cookie, PKCE, a server-side token exchange and Google's userinfo endpoint. Only verified Google email addresses are accepted and Google access tokens are not stored. A Google sign-in is never linked automatically to an existing password account with the same email.

## Administrator account

The admin panel is a separate page at `/admin` with its own sign-in. Nothing in the marketplace links to it, and a member account never has administrator rights.

There is exactly one administrator. It is not a member account: its email and scrypt password hash live in their own `admin_auth` table with their own sessions (12 hours, HttpOnly, SameSite=Strict cookie), so member sign-up, sign-in and password reset cannot create or take over the administrator.

Creating the administrator (once):

- Set the secret `ADMIN_SETUP_CODE` (16 characters or more), open `/admin`, and enter that code with the email and password you want. For local development put the code in a `.dev.vars` file in the project folder. Once the administrator exists the code can no longer be used, and with no code set, setup is switched off.
- On the Express edition you can instead run `npm run admin:postgres` with `ADMIN_EMAIL` and `ADMIN_PASSWORD` set.

The administrator password (12 to 128 characters) is changed inside the panel with **Change password**, which signs out every other admin session. There is no forgotten-password flow for the administrator: if that password is lost, someone with database access must delete the row in `admin_auth` and run setup again. Sign-in, setup and password attempts are limited per IP address.

## Forgotten member passwords

Password reset does not depend on email. The member contacts support; the administrator confirms who they are, opens `/admin` → Members → **Reset password**, and gives them the one-time code shown. The member enters that code with their email and a new password on the Forgot Password page. A code is valid for 60 minutes and for one use, issuing a new one cancels the previous one, and a successful reset signs the member out everywhere else. Issued codes appear in the admin Activity log.

## Notification emails

Every in-app notification (new offer, offer selected, new message, new review, payment decision, promotion or request expired, account or content update, listing limit reached) can also be sent to the member's email address through [Resend](https://resend.com).

1. Create a Resend account and an API key.
2. Set `RESEND_API_KEY` on the server.
3. Optionally verify your own domain in Resend and set `EMAIL_FROM`, for example `Picking Price <notify@yourdomain.com>`.

Without `RESEND_API_KEY` no email is sent and the in-app notifications work as usual. Without `EMAIL_FROM` Resend's test sender is used, which only delivers to the Resend account owner's own address; a verified domain is needed to email every member.

Rules the sender follows: each notification is emailed at most once; chat messages send at most one email per conversation every 15 minutes; accounts registered with a phone number instead of an email address are skipped; notifications older than one hour are never emailed, so switching the key on does not send a backlog.

## Not included

Email address confirmation, multi-factor sign-in and member-managed account linking are not implemented.

## Checks

`npm run test:password` covers password hashing, `npm run test:auth` covers sign-up, sign-in and sessions on the Workers runtime (build first), and `npm run test:http` covers the Express server, including notification emails against a stand-in mail server. All use throwaway databases.
