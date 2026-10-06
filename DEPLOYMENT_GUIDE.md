# Picking Price — cPanel and Local Server Deployment Guide

Prepared for Ahsan Javaid • 27 September 2026

## 1. Read this first

Use the project's **portable React + Node.js + Express + PostgreSQL edition** for these deployments. The Cloudflare Workers edition (D1/R2) is used for local development; its compiled Worker archive is not a cPanel installation package.

This guide is based on the current project source, including `server/index.ts`, `server/app.ts`, `server/create-admin.ts`, `server/migrate.ts`, and `package.json`. It is a deployment procedure, not a claim that your cPanel account or local server has already been configured or tested.

| Target | Requirements | Recommended approach |
|---|---|---|
| Windows 11 local computer | Node.js, pnpm, PostgreSQL | Run Express locally; suitable for demonstration and testing |
| Linux local server | Same requirements, persistent disk, service manager | Run Express as a non-root systemd service |
| cPanel hosting | Node.js application support, compatible runtime, PostgreSQL access, persistent uploads | Follow the cPanel section; confirm provider support first |
| PHP/MySQL-only hosting or XAMPP alone | Missing this application's backend stack | Not compatible without a separate Node/PostgreSQL service |

**Important:** Deploying the portable edition does not copy any other installation's database, uploaded photos or accounts. A new PostgreSQL database starts separately. Do not assume the new domain is private: restrict access during commissioning if required.

## 2. Obtain the correct project files

Obtain a source export or authorized Git checkout of Picking Price—not a download of the web page and not only the `dist` folder. This guide does not include the source archive.

Keep the complete source, especially:

- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vite.postgres.config.ts`
- `client/`, `app/`, `components/`, `lib/`, `public/`
- `server/`, `drizzle/`, and `tests/` for verification

Do not transfer existing secrets, local test databases or `node_modules` from another machine. Install dependencies on the destination operating system. Preserve the lockfile. The root `public/` folder contains source assets; `pnpm build:postgres` produces the separately served `server/public/` folder.

For these targets, use:

```text
Build:         pnpm build:postgres
Start:         pnpm start:postgres
Create admin:  pnpm admin:postgres
```

Do **not** substitute the default `pnpm build`, `pnpm start`, or `pnpm dev`: those belong to the Workers edition.

## 3. Software and configuration

### Runtime requirements

- Node.js: the project's declared minimum is **22.13.0**. Use a maintained release compatible with the locked dependencies; verify the actual selected runtime, not only your desktop version.
- pnpm: the project pins **11.25.0** in `package.json`. Use that version and the supplied lockfile. If it is unavailable from your configured registry, stop and resolve the installation rather than silently changing dependencies.
- PostgreSQL: use a supported server release. The existing integration tests used embedded PostgreSQL/PGlite, not your external server; run the acceptance checklist against your installation.
- A database account able to create and modify tables/indexes in the application database. Do not run the application as the PostgreSQL superuser.

Example installation of the pinned package manager, where your account permits npm global installations:

```bash
npm install --global pnpm@11.25.0
node --version
pnpm --version
```

On managed hosting, use the provider's selected Node environment and approved package-manager installation method instead of attempting privileged installs.

### Environment variables

| Variable | Local example / purpose |
|---|---|
| `DATABASE_URL` | `postgresql://picking_user:ENCODED_PASSWORD@127.0.0.1:5432/picking_price` |
| `APP_ORIGIN` | Exact browser origin, e.g. `http://localhost:3000` or `https://market.example.com`; no trailing slash or path |
| `PORT` | `3000` for direct Node startup; use the hosting provider's routing configuration under Passenger |
| `UPLOADS_DIR` | Absolute, persistent, writable directory outside the code release, e.g. `C:/PickingPriceData/uploads` |
| `NODE_ENV` | `production` when running the built application |
| `GOOGLE_CLIENT_ID` | Optional Google web application client ID |
| `GOOGLE_CLIENT_SECRET` | Optional server-only Google client secret |
| `RESEND_API_KEY` | Optional. API key from resend.com; when set, every in-app notification is also emailed to the member |
| `EMAIL_FROM` | Optional sender for those emails, e.g. `Picking Price <notify@yourdomain.com>` on a domain verified in Resend. Without it Resend's test sender is used, which only delivers to the Resend account owner's own address |
| `PGSSL` | `require` enables verified database TLS in `server/index.ts`; see the TLS caveat below |
| `NODE_EXTRA_CA_CERTS` | Optional trusted database CA certificate file when required by the provider |

Passwords inside a connection URL must be URL-encoded. For example, a literal `@` in a password is `%40`. Do not paste database URLs or secrets into support tickets, screenshots or source control.

**Environment-file behavior:** `pnpm start:postgres` and `pnpm admin:postgres` read process environment variables; they do not automatically load a `.env` file. The explicit `node --env-file=...` commands below load it. Existing process variables can override values loaded from a file, so remove stale settings when troubleshooting.

**Remote PostgreSQL TLS caveat:** the admin creation script does not read `PGSSL`, although the main server does. For a remote database, use the provider's verified-TLS connection URL for both commands, such as its documented `sslmode=verify-full` configuration, with the correct CA trust. Avoid mixing conflicting URL SSL options with `PGSSL`; URL SSL parameters can override the pool SSL object. Never fix certificate errors by disabling certificate verification. Local loopback PostgreSQL can use the simple URL shown above when configured that way.

The administrator is created with `pnpm admin:postgres` (below) and signs in at `/admin`; member accounts never have administrator rights. Notification emails are optional: they are sent only when `RESEND_API_KEY` is set (see the table above). Password reset does not use email; the administrator issues a one-time reset code from the admin panel.

## 4. Windows 11 local installation

### Step 1 — Install software and extract the source

Install Node.js and PostgreSQL using their official Windows installers. Include PostgreSQL command-line tools and optionally pgAdmin. If commands are not found, open a new terminal and check PATH. Extract the project into:

```text
C:\Projects\picking-price
```

Use PowerShell from that folder:

```powershell
Set-Location C:\Projects\picking-price
node --version
pnpm --version
pnpm install --frozen-lockfile --prod=false
pnpm build:postgres
```

Keep development dependencies installed for this source-running deployment: `tsx`, required by the startup command, currently lives in `devDependencies`. Do not prune them after the build.

### Step 2 — Create a dedicated database

Open SQL Shell (`psql`) as the PostgreSQL administrator. Execute the following once for a new installation:

```sql
CREATE ROLE picking_user LOGIN;
\password picking_user
CREATE DATABASE picking_price OWNER picking_user;
```

The `\password` command prompts without putting the password directly into SQL history. Choose a unique password. If the role/database already exists, inspect and reuse the intended one; do not delete it to rerun these commands.

### Step 3 — Create a private configuration file

Create `C:\PickingPriceData\uploads` and a text file named `C:\PickingPriceData\picking-price.env` using an editor. Ensure it is not accidentally saved as `.env.txt`. Restrict access to your account and the service account, if any.

```dotenv
DATABASE_URL="postgresql://picking_user:REPLACE_WITH_URL_ENCODED_PASSWORD@127.0.0.1:5432/picking_price"
APP_ORIGIN="http://localhost:3000"
PORT=3000
UPLOADS_DIR="C:/PickingPriceData/uploads"
NODE_ENV=production
```

Replace the password placeholder before running anything. Never store this file under a publicly served folder.

### Step 4 — Create the administrator

Use an email address that has not already registered in this database. In PowerShell 7, from the project folder:

```powershell
$env:ADMIN_EMAIL = Read-Host 'Administrator email'
$env:ADMIN_PASSWORD = Read-Host 'Unique admin password (at least 16 characters)' -MaskInput
try {
    node --env-file=C:/PickingPriceData/picking-price.env --import tsx server/create-admin.ts
} finally {
    Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:ADMIN_EMAIL -ErrorAction SilentlyContinue
}
```

`-MaskInput` requires PowerShell 7. If using Windows PowerShell 5.1, use a secure-input method or install PowerShell 7; do not put the password into a saved command script. The admin script applies migrations and creates the single administrator. If an administrator already exists it changes nothing.

### Step 5 — Start and verify

```powershell
node --env-file=C:/PickingPriceData/picking-price.env --import tsx server/index.ts
```

Open **http://localhost:3000**. Keep the terminal open; Ctrl+C stops the server. Open **http://localhost:3000/admin** and sign in with the administrator account, then complete Section 9.

Check the API in another PowerShell terminal:

```powershell
Invoke-RestMethod http://localhost:3000/api/auth/options
```

Expect email authentication enabled and Google disabled unless both Google variables are set. The server automatically applies unapplied migrations in `drizzle/` at startup. Do not manually run `drizzle-kit push` against this installation.

### Optional — Access from another computer on your LAN

Use a stable private IP for the server. For example, if its actual address is `192.168.1.20`, set `APP_ORIGIN=http://192.168.1.20:3000`, restart and browse that exact URL from all test clients. `localhost` and the IP address are different origins; mixing them can cause rejected form submissions.

The current server binds to all interfaces. Allow port 3000 only from the trusted local subnet in Windows Firewall; do not open it to the internet. Local HTTP is for demonstrations with test data, not confidential production use. Google login needs internet access even when the application is local.

## 5. Linux local server / production service

Install the compatible Node/pnpm toolchain and PostgreSQL using the distribution's supported procedures. Use a dedicated non-root OS account, here called `pickingprice`. Place the project in `/opt/picking-price`, configuration in `/etc/picking-price.env`, and uploads in `/var/lib/picking-price/uploads`. Have the administrator grant the service account read access to the source/config and write access only where required, including uploads.

Create the database and role as in Section 4. Install dependencies and build from `/opt/picking-price` as the application owner:

```bash
pnpm install --frozen-lockfile --prod=false
pnpm build:postgres
```

Use the same environment-file format as Section 4, changing paths and `APP_ORIGIN`. For initial local testing, use `http://localhost:3000`. Restrict the configuration file, for example to owner root/group pickingprice with mode `0640`.

Create the admin from the project root in Bash, as an account allowed to read the configuration:

```bash
read -r -p 'Administrator email: ' ADMIN_EMAIL
read -r -s -p 'Administrator password (16+ characters): ' ADMIN_PASSWORD
export ADMIN_EMAIL ADMIN_PASSWORD
node --env-file=/etc/picking-price.env --import tsx server/create-admin.ts
unset ADMIN_EMAIL ADMIN_PASSWORD
```

For persistent operation, have the system administrator create `/etc/systemd/system/picking-price.service`:

```ini
[Unit]
Description=Picking Price marketplace
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pickingprice
Group=pickingprice
WorkingDirectory=/opt/picking-price
EnvironmentFile=/etc/picking-price.env
ExecStart=/usr/bin/node --import tsx server/index.ts
Restart=on-failure
RestartSec=5
UMask=0027
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

Replace `/usr/bin/node` with the actual absolute compatible Node executable, confirmed using `command -v node`. A shell-only version manager is not automatically available to systemd.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now picking-price
sudo systemctl status picking-price
sudo journalctl -u picking-price -n 100 --no-pager
```

For production, put a correctly configured HTTPS reverse proxy in front of the service, set `APP_ORIGIN` to that HTTPS origin and prevent external access to port 3000. Forward the original host and protocol and allow photo bodies up to 5 MB. The Express adapter currently trusts one proxy hop: additional CDN/proxy layers require a review of that setting and client-IP handling. Do not publish a multi-proxy installation without checking rate limiting and forwarded headers.

For a Windows unattended server, use an approved Windows service manager or a properly configured Task Scheduler task under a dedicated account. Set the working directory to the project root, preserve private environment-file access and configure restart/log retention. The foreground PowerShell procedure alone does not survive logoff or reboot.

## 6. cPanel deployment

### Step 1 — Confirm hosting compatibility before uploading

Ask your host to confirm:

- Node.js application support through Application Manager/Passenger, CloudLinux's Node.js selector, or a managed startup command.
- A Node version satisfying this project and support for the pinned pnpm installation.
- PostgreSQL database access, locally or to an allowed remote server.
- Terminal/SSH or equivalent support for dependency installation, building and one-time admin setup.
- Persistent writable storage, HTTPS, and outbound HTTPS to Google's OAuth endpoints if Google login is required.

cPanel features vary by provider. If PostgreSQL or Node controls are absent, ask the host to enable them or use a compatible server. Do not choose MySQL in place of PostgreSQL. Official cPanel references are linked in Section 12.

### Step 2 — Domain and directories

Use a dedicated subdomain such as `market.example.com`, with the app at `/`, not `/picking-price`. The frontend currently uses root-relative assets and `/api/...` URLs; subdirectory deployment needs code changes.

Example paths, replacing `CPUSER` with your actual cPanel account name:

```text
Application root: /home/CPUSER/picking-price
Uploaded photos:  /home/CPUSER/picking-price-data/uploads
Private config:   /home/CPUSER/picking-price-data/picking-price.env
```

Keep the source and private config outside `public_html`. Let the application manager route the domain to Node; do not expose the source tree as a static document root. Enable a valid HTTPS certificate before testing login on the production URL.

Upload/extract the source into the application root. Do not upload desktop `node_modules`. If building on another computer, include the generated `server/public/`, but still install compatible server dependencies on the host.

### Step 3 — PostgreSQL and configuration

In **PostgreSQL Databases** or the PostgreSQL wizard, create the database and user, then associate the user with the database with the privileges needed for migrations. Copy the actual full names; cPanel may prefix them with the account name. Obtain the correct hostname and port from the host.

Set the application variables through its environment-variable interface, or use the private environment file with the explicit startup method below:

```dotenv
DATABASE_URL="postgresql://CPUSER_dbuser:ENCODED_PASSWORD@DATABASE_HOST:5432/CPUSER_pickingprice"
APP_ORIGIN="https://market.example.com"
UPLOADS_DIR="/home/CPUSER/picking-price-data/uploads"
NODE_ENV=production
```

These are placeholders, not real credentials. Apply verified database TLS for a remote database as described in Section 3. Do not leave `ADMIN_PASSWORD` permanently in the application's environment settings.

### Step 4 — Activate the provider's Node environment and build

If the panel shows an activation command, use that exact command first. Then change into the application root and check `node --version` and `pnpm --version`.

```bash
cd /home/CPUSER/picking-price
pnpm install --frozen-lockfile --prod=false
pnpm build:postgres
```

Do not rely on a panel's generic “Run npm install” button to reproduce this pnpm lockfile. Some CloudLinux environments manage `node_modules` themselves; ask the provider how to install the pinned dependencies there. Do not replace a provider-managed directory or symlink to force installation. If the host cannot support this workflow, use a compatible plan/server.

### Step 5A — Hosting that accepts a startup command

Choose this path when your host explicitly supports a managed command. Set the working directory to the application root. With panel-provided environment variables, use:

```bash
node --import tsx server/index.ts
```

With the private environment file, use:

```bash
node --env-file=/home/CPUSER/picking-price-data/picking-price.env --import tsx server/index.ts
```

Let the host supply/route the listening port. Do not run a second unmanaged copy from an SSH terminal once the managed application is running.

### Step 5B — Passenger hosting that accepts a startup file

Passenger deployments often expect a startup filename instead of a command. This project uses ES modules and TypeScript; simply entering `server/index.ts` or renaming it to `app.js` is not a complete adaptation.

Create `passenger.cjs` in the application root using an editor:

```javascript
const { pathToFileURL } = require('node:url');
const { tsImport } = require('tsx/esm/api');

process.chdir(__dirname);

// Use panel-provided variables by default. If using a private env file,
// uncomment the following line and replace CPUSER with the real account:
// process.loadEnvFile('/home/CPUSER/picking-price-data/picking-price.env');

tsImport('./server/index.ts', pathToFileURL(__filename).href)
  .catch((error) => {
    console.error('Picking Price startup failed:', error.message);
    process.exitCode = 1;
  });
```

Set the application root to `/home/CPUSER/picking-price`, URL to `https://market.example.com/`, environment to Production, and custom startup file to `passenger.cjs`.

This wrapper is an adaptation to validate on your host, not a certified Passenger deployment. If the UI only supports the default `app.js`, ask the provider to configure `PassengerStartupFile passenger.cjs`; do not put CommonJS `require()` code into a root `.js` file while `package.json` declares `type: module`. cPanel's Apache configuration changes require the hosting administrator. Do not attempt to edit system Apache files from a restricted shared account.

Start/restart from the panel and check the application's logs. If Passenger does not intercept this server's listener correctly, ask the host to inspect Node/Passenger compatibility or use the supported startup-command route. Do not expose a spare port as an improvised bypass.

### Step 6 — Create the admin and restart

From the application root, run the Bash admin setup in Section 5, changing the environment-file path to your cPanel private file. Panel variables are not necessarily inherited by an SSH shell, so supply them explicitly or use that file.

Run initial migrations/admin setup once, before enabling concurrent application workers. The current startup migration runner is not designed as a distributed migration coordinator. Coordinate later schema upgrades in a maintenance window.

Restart using the panel's control. Where the provider uses Passenger's restart-file convention, run from the verified application root:

```bash
mkdir -p tmp
touch tmp/restart.txt
```

Open the HTTPS domain and complete the acceptance checklist. cPanel Application Manager commonly places Node logs under the application's `logs/` directory; provider-specific interfaces may show a different log location.

## 7. Google signup configuration

Create a Google OAuth **Web application** client and configure the consent/audience settings. Use separate clients for development and production where practical. If the consent application is in testing, add the intended test users.

Register the exact redirect URI for each deployment:

```text
Local:       http://localhost:3000/api/auth/google/callback
Production:  https://market.example.com/api/auth/google/callback
```

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` only on the server, then restart. Ensure `APP_ORIGIN` matches the registered origin. Never reuse another domain's callback address. This application uses the server-side redirect flow; a JavaScript-origin setting is not a replacement for the callback URI.

Test with an allowed Google account, sign out and sign in again. Existing email/password accounts are intentionally not auto-linked to Google by matching email; use a fresh test identity to verify new Google registration. LAN-IP HTTP deployment is not the recommended Google development setup; use localhost or an appropriate HTTPS test hostname.

## Railway

Railway runs this same portable edition from the repository's `Dockerfile`; nothing needs to be typed into Railway's build or start command boxes.

1. In Railway choose **New Project → Deploy from GitHub repo** and pick this repository.
2. In the same project choose **New → Database → PostgreSQL**.
3. Open the app service → **Variables** and add:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (use the reference picker so it points at the database service)
   - `ADMIN_SETUP_CODE` = a private phrase of your own, 16 characters or more
4. App service → **Settings → Networking → Generate Domain**. The app reads the domain Railway assigns, so `APP_ORIGIN` is only needed for a custom domain (set it to the exact `https://…` address, no trailing slash).
5. App service → **Volumes**: add a volume mounted at `/data`. Uploaded photos are stored in `/data/uploads`; without a volume every redeploy deletes them.
6. After the deploy is live, open `https://<your-domain>/admin`, enter the setup code and choose the administrator email and password. The code cannot be used again afterwards and can be removed from Variables.

The database starts empty: accounts and listings from a local copy are not transferred. `PORT` is supplied by Railway. Optional: `NEXT_PUBLIC_GOOGLE_MAPS_KEY` (location detection; it is built into the page, so redeploy after changing it) the Google sign-in variables from Section 7, and `RESEND_API_KEY` / `EMAIL_FROM` for notification emails.

## 8. First administrator configuration

After signing in at `/admin` (the password can be changed there with **Change password**):

1. Review categories and subcategories.
2. Check the free listing allowance (default 25) and extra-slot price (default Rs. 50).
3. Enter your real external payment instructions. Do not invent account numbers or enable real payments using test instructions.
4. Check the three promotion durations/prices and placement behavior.
5. Confirm that sample listings/requests are clearly labelled examples, not real seller inventory.
6. Create separate buyer/seller test accounts. Do not test ordinary-user permissions while signed in as the administrator.

Only manually approved seller-service payments activate slots/promotions. Product purchase payments and delivery remain outside the platform.

## 9. Post-deployment acceptance checklist

Use staging/test accounts and fictitious references for workflow tests. Do not approve a real service request without verifying the external transfer.

- [ ] Homepage, product images, menus and built assets load without 404/500 errors.
- [ ] Email registration, login, logout and rejected incorrect passwords work.
- [ ] Administrator can access admin sections; ordinary users cannot.
- [ ] Listing create/edit/remove, request lifecycle and seller offer/select flows work.
- [ ] Search, filters, sort and independent pagination return expected results.
- [ ] Wishlist, messages, reviews, reports and notifications work with two accounts.
- [ ] JPEG/PNG/WebP uploads work; photos remain after an application restart and code update.
- [ ] Unsupported/oversized uploads are rejected and never executed.
- [ ] Slot limits, manual payment rejection/approval and promotion expiry work in staging.
- [ ] Google signup succeeds with configured credentials and exact callback.
- [ ] HTTPS cookies persist; origin checks do not reject valid forms.
- [ ] Desktop, tablet, mobile, keyboard navigation and zoom are tested manually.
- [ ] Service restarts after reboot or provider restart and logs are accessible.
- [ ] Database and uploaded-media backups can be restored into an isolated environment.

Available local automated checks:

```bash
pnpm exec tsc --noEmit
pnpm test:password
pnpm test:market
pnpm build:postgres
pnpm test:http
pnpm lint
```

The market suite also uses a local D1 emulator and may need tooling unavailable on restrictive shared hosting. Run it on a suitable workstation/CI environment. The Express HTTP suite uses an isolated embedded database; it does not prove connectivity to your production PostgreSQL database.

Run these suites again after every change and before every release; a passing run on a workstation does not replace the checklist above on the real server.

## 10. Backups, updates and recovery

Back up three separate things: **PostgreSQL data, uploaded files, and private configuration**. Keep source releases/version identifiers as well. A source-code archive alone is not a data backup.

Use PostgreSQL's `pg_dump` in custom format, with a protected password file or interactive password prompt rather than putting credentials in the command line. Example for the local names above:

```bash
pg_dump -h 127.0.0.1 -U picking_user -d picking_price -W -Fc -f picking-price-backup.dump
```

Store backups outside the publicly served directory, encrypt off-server copies, and limit access. Take a matching copy/snapshot of `UPLOADS_DIR` while writes are paused so the media files and database references stay consistent. Arrange a daily schedule and retention suited to your data; no scheduled backup is installed by this guide.

For a restore rehearsal, have the DBA create a **new empty test database** owned by the restore user, then restore into that database—not production:

```bash
pg_restore -h 127.0.0.1 -U picking_user -W --no-owner --no-privileges -d picking_price_restore_test picking-price-backup.dump
```

Restore media to a separate test directory and use a separate origin/configuration. Check accounts, listings and images before relying on the backup. Retain compatible PostgreSQL client tools for the server/dump version.

For an update:

1. Review changes and test the new release against an isolated database.
2. Put the live installation into a maintenance window and stop writes.
3. Back up database, uploads and configuration; record the previous release.
4. Install the new source without overwriting external uploads or secrets.
5. Install locked dependencies and run `pnpm build:postgres`.
6. Start one application process to apply new migrations, then enable the normal service.
7. Complete smoke tests and reopen access.

Never edit an already-applied migration to change the schema. Use a new migration. Rolling back code does not roll back a schema change; restore only after assessing data written since the backup and the compatibility of the old release.

## 11. Troubleshooting

| Symptom | Check / action |
|---|---|
| Node.js/PostgreSQL menu missing | Provider feature unavailable; request support or a compatible plan |
| `Set DATABASE_URL` error | Private env file was not loaded or panel variables were not inherited |
| `ERR_MODULE_NOT_FOUND: tsx` | Dependencies were pruned/installed production-only; reinstall locked dependencies including dev packages |
| `ERR_REQUIRE_ESM` / unknown `.ts` extension | Wrong startup path; use `--import tsx` or the validated `.cjs` wrapper |
| Database authentication failure | Full prefixed username/database, password URL encoding, host, port and grants |
| Database certificate error | Correct CA and verified TLS settings; do not disable verification |
| Missing `drizzle` or `server/public/index.html` | Wrong working directory, missing source migrations or missing portable build |
| Page opens but CSS/API fails | Subdirectory deployment or wrong static routing; use a dedicated hostname at `/` |
| Form submission returns invalid origin | `APP_ORIGIN` must exactly match scheme, hostname and port used in the browser |
| Login loops / no session | HTTPS origin, secure-cookie behavior, stale cookies and proxy routing |
| Upload permission error / photos disappear | Use a persistent absolute directory writable by the application account |
| Photos above a smaller size fail | Check proxy/provider body-size limit as well as the application's 5 MB limit |
| Google button disabled | Both Google environment variables must be present; restart the service |
| Google `redirect_uri_mismatch` | Register the exact callback, including scheme, hostname, port and path |
| An administrator already exists | The script changes nothing; sign in at `/admin` and use **Change password** |
| cPanel 503 / Passenger startup timeout | Inspect app logs for runtime, module, database or migration failures; request host assistance |
| Multiple workers fail during upgrade | Coordinate migrations through one process before starting concurrent workers |

Share sanitized error messages when requesting help. Remove passwords, tokens, full connection URLs and personal data from logs first.

## 12. Official references and verification scope

Consulted 27 September 2026. Commands and application-specific caveats were checked against the current source. Provider controls can vary, and no access to your cPanel account was used.

- [cPanel: Application Manager](https://docs.cpanel.net/cpanel/software/application-manager/)
- [cPanel: Installing a Node.js application and Passenger startup/restart](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/)
- [cPanel: PostgreSQL Databases](https://docs.cpanel.net/cpanel/databases/postgresql-databases/)
- [CloudLinux: Manager and Node.js selector](https://docs.cloudlinux.com/cloudlinuxos/lve_manager/)
- [Node.js: Environment files](https://nodejs.org/api/environment_variables.html)
- [tsx: TypeScript import API](https://tsx.is/dev-api/ts-import)
- [node-postgres: TLS/SSL configuration](https://node-postgres.com/features/ssl)
- [Google: OAuth for web-server applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [PostgreSQL downloads](https://www.postgresql.org/download/)

No application code, production deployment, hosting account, database or firewall was changed while preparing this guide.
