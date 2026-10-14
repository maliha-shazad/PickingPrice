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

- Set the secret `ADMIN_SETUP_CODE` (16 characters or more), open `/admin`, and enter that code with the email and password you want. For local development the code goes in the `.env` file in the project folder. Once the administrator exists the code can no longer be used, and with no code set, setup is switched off.
- Or, with access to the server, run `npm run admin:create` with `DATABASE_URL`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` (16 characters or more) set.

The administrator password (12 to 128 characters) is changed inside the panel with **Change password**, which signs out every other admin session. There is no forgotten-password flow for the administrator: if that password is lost, someone with database access must delete the row in `admin_auth` and run setup again. Sign-in, setup and password attempts are limited per IP address.

## Forgotten member passwords

A member resets a forgotten password from the **Forgot Password** page in three steps:

1. They enter the email address of their account. The site emails a 6-digit code to that address. The answer on screen is the same whether or not the address has an account.
2. They enter the code. It is valid for 15 minutes, works once, and a newer code cancels an older one.
3. They choose a new password and confirm it. The password is updated, every existing session of the account is signed out, and the member logs in with the new password.

This needs outgoing email to be working (next section). Until it is, the page says so and asks the member to contact support.

**Codes from the administrator.** The administrator can also issue a code: `/admin` → Members → **Reset password**. It is valid for 60 minutes and works once. The member enters it through "Already have a code from support?" on the Forgot Password page. This is the way for accounts registered with a phone number, and a fallback if an email does not arrive. Issued codes appear in the admin Activity log.

Requests for a code, code checks and password changes are all counted by the same limit as sign-in attempts (per email address and per IP address), so a code cannot be guessed by trying many.

## Outgoing email

The site sends two kinds of email: password reset codes, and a copy of every in-app notification (new offer, offer selected, new message, new review, payment decision, promotion or request expired, account or content update, listing limit reached). Email is sent over HTTPS, so it works on hosts that block SMTP.

### Gmail (works without your own domain)

The site sends from a Gmail account of your own, through Google's Gmail API. The emails really come from that address, so no domain is needed. A normal Gmail account can send about 500 emails a day.

**In Google Cloud (once)**

1. Open [console.cloud.google.com](https://console.cloud.google.com) and create a project for email. Keep it separate from the project used for Google sign-in, so the permission to send email never becomes part of the sign-in app's review.
2. **APIs & Services → Library**: find **Gmail API** and enable it.
3. **Google Auth Platform**: fill in the app name and support email, choose audience **External**, and add the sending Gmail address as a test user.
4. **Clients → Create client**, type **Web application**, with this authorised redirect URI (your own site address):
   `https://YOUR-DOMAIN/api/admin/mail/callback`
5. Set the client's two values on the server and redeploy:
   - `GMAIL_CLIENT_ID`
   - `GMAIL_CLIENT_SECRET`

**In the admin panel (once)**

1. Open `/admin` → **Settings** → **Email** and press **Connect Gmail**.
2. Sign in with the Gmail address the emails should come from. Google shows "Google hasn't verified this app" because the app is your own and unreviewed: choose **Advanced**, continue, tick **Send email on your behalf** and confirm.
3. Back in the panel the section shows the connected address. Press **Send test email** and check that it arrives.

**Keeping the connection alive.** While the Google project's publishing status is **Testing**, Google cancels the connection after 7 days. Set it to **In production** (Google Auth Platform → Audience → **Publish app**) and connect again; the connection then lasts until it is removed. The app can stay unverified: the only effect is the warning in step 2, which only the administrator ever sees. Google also cancels the connection when the Gmail account's password is changed or the permission is removed in the Google account. When that happens the Email section says so in red and nothing is sent until **Connect again** is pressed.

**What is stored.** Google gives the site a token that allows sending email from that account and nothing else: the site cannot read the mailbox. The token is kept in the `mail_account` table and is unusable without `GMAIL_CLIENT_SECRET`. **Disconnect** deletes it and tells Google to cancel it. Connecting and disconnecting appear in the admin Activity log.

### Resend (needs your own domain)

Set `RESEND_API_KEY`, verify your domain in [Resend](https://resend.com) and set `EMAIL_FROM` to an address on it. Without a verified domain Resend only delivers to the Resend account owner's own address. A connected Gmail account is used first; Resend is used when none is connected.

### Rules the sender follows

Each notification is emailed at most once; chat messages send at most one email per conversation every 15 minutes; accounts registered with a phone number are skipped; notifications older than one hour are never emailed, so switching email on does not send a backlog. When neither Gmail nor Resend is ready no email is sent and the in-app notifications work as usual.

## Not included

Email address confirmation at sign-up, multi-factor sign-in and member-managed account linking are not implemented.

## Checks

`npm run test:password` covers password hashing, and `npm run test:http` covers sign-up, sign-in, sessions, the administrator, password reset by email and notification emails against a stand-in mail server (build first with `npm run build`). Both use throwaway databases.
