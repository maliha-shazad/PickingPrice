# Picking Price â€” Deployment Guide

Prepared for Ahsan Javaid â€¢ 14 October 2026

## 1. What is being deployed

Picking Price is one application: a React site built with Vite, served by a Node.js + Express server that keeps its data in PostgreSQL.

| Part | Where it is in the project |
|---|---|
| Browser app (React) | `client/`, `app/`, `components/`, `public/` â€” `pnpm build` compiles it into `server/public/` |
| Server (Express) | `server/` â€” started with `node --import tsx server/index.ts` |
| Marketplace rules | `lib/market/` |
| Database tables | `drizzle/*.sql` â€” applied automatically every time the server starts |
| Container image | `Dockerfile` â€” used by Railway and by Cloudflare Containers |

Every hosting option below needs three things:

1. **Node.js 24.18 or newer** (the `Dockerfile` already uses Node 24).
2. **A PostgreSQL database**, given to the server as `DATABASE_URL`.
3. **A place where uploaded photos stay.** The server writes each photo as a file in `UPLOADS_DIR`. This works on Railway (with a volume) and on your own computer or server. It does **not** work on Vercel or Cloudflare Containers without a code change, because their disks are temporary â€” see Sections 5 and 6.

### Software versions

| Software | Version | Notes |
|---|---|---|
| Node.js | 24.18 or newer | The `Dockerfile` uses `node:24-slim` |
| pnpm | 11.25.0 | Pinned in `package.json`; install with `npm install --global pnpm@11.25.0` |
| PostgreSQL | 18 on Railway, 17.11 locally | Any supported PostgreSQL works; the tables are created by `drizzle/*.sql` |
| Express | 5.2.1 | Web server |
| React / Vite | 19.2.6 / 8.0.13 | Built once with `pnpm build` |
| tsx | 4.23.13 | Starts the server: `node --import tsx server/index.ts` |

The complete list of components and versions is in [README.md](README.md#technology). Versions checked on 16 October 2026 against the installed packages and the live services.

### Environment variables

| Variable | Needed | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:password@host:5432/picking_price`. A password containing `@`, `:` or `/` must be URL-encoded (`@` is `%40`) |
| `APP_ORIGIN` | Yes, except on Railway's own domain | The exact address people open, e.g. `https://pickingprice.pk` â€” no trailing slash. Forms from any other address are rejected |
| `ADMIN_SETUP_CODE` | Once | A private phrase of 16+ characters used to create the administrator at `/admin`. After that it can be removed |
| `PORT` | No | Port to listen on; default `3000`. Railway sets it itself |
| `UPLOADS_DIR` | No | Folder for uploaded photos; default `server/uploads` (on Railway: the volume, `/data/uploads`) |
| `PGSSL` | No | `require` turns on verified TLS to the database |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No | Google sign-in (Section 8) |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` | No | Sending password-reset codes and notification emails from a Gmail account (see [AUTH_SETUP.md](AUTH_SETUP.md)) |
| `RESEND_API_KEY`, `EMAIL_FROM` | No | Email through Resend instead of Gmail; needs your own verified domain |
| `GOOGLE_SITE_VERIFICATION` | No | Google Search Console ownership token(s). Several can be given, separated by commas; keep old ones so earlier verifications stay valid |
| `GOOGLE_MAPS_KEY` | No | Detects the visitor's city. It is built into the page, so it must be present when `pnpm build` runs (rebuild after changing it) |

Never commit real values. Locally they live in `.env`, which git ignores.

## 2. On your own computer

This is what `npm run dev` does on the development machine. The full setup, including the project's own PostgreSQL server in `.postgres/` (port 5433), is in [README.md](README.md#running-it-locally).

```bash
pnpm install
npm run dev        # builds, starts the local PostgreSQL if needed, starts the site
```

Open http://localhost:3000. Create the administrator at http://localhost:3000/admin with the `ADMIN_SETUP_CODE` from `.env`.

To run the built site against any other PostgreSQL (for example on a Linux server), set the variables in the environment and start it with:

```bash
pnpm install --frozen-lockfile
pnpm build
DATABASE_URL=... APP_ORIGIN=https://your-domain UPLOADS_DIR=/var/lib/picking-price/uploads pnpm start
```

`pnpm start` does not read `.env`; either export the variables or use `node --env-file=/path/to/file --import tsx server/index.ts`. On a server, run it under a service manager (systemd, or a Windows service) so it restarts after a reboot, and put an HTTPS reverse proxy in front of it that allows request bodies of at least 5 MB.

## 3. Railway (where the live site runs)

The live site is on Railway: project `picking-price`, a `web` service built from this repository's `Dockerfile` and a `Postgres` service. Every push to the `main` branch on GitHub redeploys it automatically (about 2â€“3 minutes).

To set it up from scratch:

1. In Railway choose **New Project â†’ Deploy from GitHub repo** and pick this repository. Nothing needs to be typed into the build or start command boxes; the `Dockerfile` is used.
2. In the same project choose **New â†’ Database â†’ PostgreSQL**.
3. Open the app service â†’ **Variables** and add:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (use the reference picker so it points at the database service)
   - `ADMIN_SETUP_CODE` = a private phrase of your own, 16 characters or more
4. App service â†’ **Settings â†’ Networking â†’ Generate Domain**. The server reads the domain Railway assigns, so `APP_ORIGIN` is only needed for a custom domain.
5. App service â†’ **Volumes**: add a volume mounted at `/data`. Photos are stored in `/data/uploads`; without a volume every redeploy deletes them.
6. When the deploy is live, open `https://<your-domain>/admin`, enter the setup code and choose the administrator email and password. The code cannot be used again and can be removed from Variables.

Optional variables: `GOOGLE_MAPS_KEY` (it is passed to the build, so redeploy after changing it), the Google sign-in pair (Section 8) and the Gmail pair (then connect the Gmail account in `/admin` â†’ Settings â†’ Email). Changing a variable redeploys the service.

**Custom domain on Railway:** app service â†’ Settings â†’ Networking â†’ **Custom Domain**, enter the domain, and add the DNS record Railway shows at your DNS provider (for Cloudflare see Section 7). Then set `APP_ORIGIN` to `https://your-domain`.

## 4. Choosing between the other hosts

| | Railway | Vercel | Cloudflare Containers |
|---|---|---|---|
| Runs the app as it is today | Yes | No â€” code changes needed (Section 5) | Yes, except photo storage |
| Uploaded photos kept | Yes, on a volume | No: read-only disk | No: disk is wiped when the container sleeps or restarts |
| PostgreSQL | Built in | External (Neon from the Vercel Marketplace) | External (e.g. Neon) |
| Cost to start | Railway plan | Free Hobby plan for testing | Workers Paid plan, $5 a month |

**Before moving the live site to Vercel or Cloudflare Containers, photo uploads must be changed to use object storage** (for example Vercel Blob, Cloudflare R2 or any S3-compatible service) instead of the `UPLOADS_DIR` folder. Until then, photos uploaded there disappear.

## 5. Vercel

Facts from Vercel's documentation (checked 14 October 2026) that matter for this project:

- Vercel runs an Express app as one Vercel Function. It finds the app only in a file named `app`, `index` or `server` (`.ts`, `.js` and similar) **in the project root or in `src/`**. This project's entry is `server/index.ts`, so a root file such as `server.ts` is needed that creates the app and either exports it (`export default app`) or calls `app.listen`.
- `express.static()` is ignored on Vercel. Static files must be in the `public/` folder, which Vercel serves from its CDN. This project's build writes the browser app to `server/public/`, and the root `public/` folder holds source images, so the build output has to be arranged for Vercel.
- The disk is read-only except a temporary `/tmp` (up to 500 MB) that is not kept. Photos written to `UPLOADS_DIR` are lost.
- A request body can be at most **4.5 MB**; larger requests fail with `413 FUNCTION_PAYLOAD_TOO_LARGE`. This app accepts photos up to 5 MB, so either lower the app's limit below 4.5 MB or upload photos directly to object storage.
- There is no long-running process. After each request this server sends pending notification emails in the background; on Vercel that work must be handed to `waitUntil` from `@vercel/functions`, or it may be cut off.
- Functions run for up to 300 seconds on the Hobby plan. Environment variable changes apply only to new deployments.

### Code changes needed first

1. A root entry file for Vercel that imports `createApp` from `server/app.ts`, runs `migrate()` and exports the app.
2. Photos stored in Vercel Blob (or another object store) instead of `UPLOADS_DIR`, with the upload limit under 4.5 MB.
3. The built browser app placed where Vercel serves static files, plus a rewrite of unknown paths to `index.html` (the site is a single-page app).
4. Background email sending wrapped in `waitUntil`.

### Deploying once those changes are made

1. Push the project to GitHub.
2. In Vercel: **Add New â†’ Project**, import the repository. Vercel detects Express; no build command or output folder is needed for the server itself.
3. **Storage / Marketplace â†’ Neon (Postgres)**: create a database and connect it to the project. The integration adds the connection details as environment variables; make sure `DATABASE_URL` is set to the connection string (add it yourself if the integration uses another name).
4. **Settings â†’ Environment Variables**: add `APP_ORIGIN` (`https://your-project.vercel.app` or your domain), `ADMIN_SETUP_CODE`, and the optional variables from Section 1.
5. Deploy, then open `/admin` and create the administrator with the setup code.
6. **Settings â†’ Domains** to add your own domain; then update `APP_ORIGIN` and redeploy.

With the Vercel CLI (version 47.0.5 or newer): `vercel link`, `vercel env pull`, `vercel dev` to try it locally, and `vercel --prod` to deploy.

## 6. Cloudflare

There are two different ways to use Cloudflare. Pick one.

### 6A. Run the whole site on Cloudflare Containers

Cloudflare Containers run this project's `Dockerfile` behind a small Cloudflare Worker. Facts from Cloudflare's documentation (checked 14 October 2026):

- Needs the **Workers Paid plan ($5 a month)**, which includes 25 GiB-hours of memory, 375 vCPU-minutes and 200 GB-hours of disk a month; more is billed per use.
- **Disk is temporary.** When a container goes to sleep or restarts it starts again from the image with a fresh disk, so photos in `UPLOADS_DIR` are lost. Use R2 or another object store for photos before going live (Section 4).
- Docker must be running on the computer that runs `wrangler deploy`; the image must run on `linux/amd64` (the `Dockerfile` does).
- The database must be outside Cloudflare, for example Neon PostgreSQL.
- A first request after the container has been asleep waits for it to start (often 1â€“3 seconds).

These files are not part of this repository; create them in a separate deployment folder next to a copy of the project, or in the project when you deploy.

`wrangler.jsonc`:

```jsonc
{
  "name": "picking-price",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-14",
  "containers": [
    { "class_name": "PickingPrice", "image": "./Dockerfile", "max_instances": 1, "instance_type": "basic" }
  ],
  "durable_objects": {
    "bindings": [{ "name": "APP", "class_name": "PickingPrice" }]
  },
  "exports": {
    "PickingPrice": { "type": "durable-object", "storage": "sqlite" }
  },
  "vars": { "APP_ORIGIN": "https://your-domain" },
  "observability": { "enabled": true }
}
```

`src/index.ts`:

```ts
import { Container, getContainer } from "@cloudflare/containers";

export class PickingPrice extends Container {
  defaultPort = 3000;   // the port the Express server listens on
  sleepAfter = "15m";   // stop after 15 minutes without requests
}

export default {
  async fetch(request: Request, env: { APP: DurableObjectNamespace<PickingPrice>; DATABASE_URL: string; ADMIN_SETUP_CODE: string; APP_ORIGIN: string }) {
    const app = getContainer(env.APP); // one instance for the whole site
    await app.startAndWaitForPorts({
      ports: [3000],
      startOptions: { envVars: { DATABASE_URL: env.DATABASE_URL, ADMIN_SETUP_CODE: env.ADMIN_SETUP_CODE, APP_ORIGIN: env.APP_ORIGIN, PORT: "3000" } },
    });
    return app.fetch(request);
  },
};
```

Steps:

1. Create a Neon (or other) PostgreSQL database and copy its connection string.
2. `npm i -D wrangler` and `npm i @cloudflare/containers` in the deployment folder; `npx wrangler login`.
3. Store the secrets: `npx wrangler secret put DATABASE_URL` and `npx wrangler secret put ADMIN_SETUP_CODE`. Add `GOOGLE_*`/`GMAIL_*` the same way and pass them in `envVars` like the others.
4. Start Docker, then `npx wrangler deploy`. Wrangler builds the image and uploads it. Wait a few minutes after the first deploy before the site answers.
5. Check with `npx wrangler containers list`. Open the Worker's address, then `/admin` to create the administrator.
6. Your own domain: Workers & Pages â†’ the Worker â†’ Settings â†’ **Domains & Routes â†’ Add â†’ Custom Domain** (the domain must be on Cloudflare, see 6B steps 1â€“4). Set `APP_ORIGIN` to it and deploy again.

A running container keeps the environment it started with; after changing a secret, the new value is used from the next start.

### 6B. Use Cloudflare only for the domain (site stays on Railway or Vercel)

This is free and changes nothing in the project.

1. In the Cloudflare dashboard: **Domains â†’ Onboard a domain**, enter the domain, pick the Free plan and let it import the existing DNS records. Check the list: the import can miss records.
2. At your domain registrar, **switch off DNSSEC first**, then replace the nameservers with the two Cloudflare shows. Copy them exactly. It can take up to 24 hours to become Active.
3. In Railway (or Vercel), add the custom domain to the project. It shows the record to create, usually a `CNAME` to its own hostname.
4. In Cloudflare **DNS**, add that record. Start with **DNS only** (grey cloud): Cloudflare advises DNS-only for hosting platforms that do not explicitly support its proxy, otherwise SSL errors and redirect loops can happen. Check Railway's or Vercel's own documentation before switching the record to **Proxied**; if you do proxy it, set **SSL/TLS â†’ Full (strict)**.
5. Turn DNSSEC back on through Cloudflare.
6. Set `APP_ORIGIN` on the host to `https://your-domain` and redeploy. Update the Google sign-in and Gmail redirect addresses to the new domain (Section 8).

## 7. After any deployment: first settings

Sign in at `/admin` (change the password there with **Change password**) and open **Settings**:

1. Enter the real payment instructions sellers should follow (bank or mobile wallet). Until they are saved, sellers cannot submit slot or promotion requests.
2. Check the free listing allowance and the extra-slot price, and the three promotion lengths and prices.
3. Review the categories.
4. Connect the Gmail account under **Settings â†’ Email** and send a test email (needs the Gmail variables).

While the database has no real listings or requests, the site shows clearly labelled sample products. They disappear as soon as the first real listing is published.

## 8. Google sign-in and Gmail addresses

Register the exact address of each deployment in Google Cloud:

```text
Google sign-in:  https://your-domain/api/auth/google/callback
Gmail sending:   https://your-domain/api/admin/mail/callback
Local:           http://localhost:3000/api/auth/google/callback
```

Set the client ID and secret only on the server, then redeploy. `APP_ORIGIN` must match the registered address exactly. The full steps are in [AUTH_SETUP.md](AUTH_SETUP.md).

## 9. Acceptance checklist

Use test accounts and made-up payment references.

- [ ] Homepage, product images and menus load without errors, on phone, tablet and desktop.
- [ ] Sign-up, login, logout and a wrong password all behave correctly.
- [ ] Listing create/edit/remove with a photo; the photo is still there after a redeploy.
- [ ] Buyer request, seller offer and selecting an offer work with two accounts.
- [ ] Search, filters, sort and the city choice return the expected products.
- [ ] Chat between two accounts; opening the chat clears its count on the bell, and opening Notifications clears the rest.
- [ ] Wishlist, reviews and reports work.
- [ ] Slot and promotion requests can be approved and rejected in `/admin`.
- [ ] Google sign-in (if configured) and a Gmail test email (if connected) work.
- [ ] Forms are not rejected as "invalid origin" (`APP_ORIGIN` is right).

Automated checks to run before every release, on a development machine:

```bash
pnpm lint
pnpm build
pnpm test        # password, marketplace rules and HTTP server tests on throwaway databases
```

## 10. Backups and updates

Back up three things: the **PostgreSQL database**, the **uploaded photos** (`UPLOADS_DIR`, on Railway the `/data` volume) and the **private settings**. Source code alone is not a backup.

```bash
pg_dump "$DATABASE_URL" -Fc -f picking-price-backup.dump
```

Restore a backup into a new, empty test database first, never straight over the live one:

```bash
pg_restore --no-owner --no-privileges -d "$TEST_DATABASE_URL" picking-price-backup.dump
```

For an update: test the change locally (`pnpm test`), back up, then push to `main` (Railway deploys it) or deploy on the other host. New database changes go in a new file in `drizzle/`; never edit a file that has already been applied, because the server applies each file only once.

## 11. Troubleshooting

| Symptom | Check |
|---|---|
| `Set DATABASE_URL` error at start | The variable is missing in the host's settings (or `.env` was not loaded) |
| Database authentication failure | User name, password URL-encoding, host, port |
| Database certificate error | Use the provider's TLS connection string or `PGSSL=require` with the right CA; never switch verification off |
| Page opens but forms say "invalid origin" | `APP_ORIGIN` must exactly match the address in the browser (scheme, host, port) |
| Login does not stick | HTTPS address and `APP_ORIGIN` mismatch, or old cookies |
| Photos disappear after a redeploy | No persistent folder: add a Railway volume at `/data`; on Vercel/Cloudflare use object storage (Section 4) |
| Photo upload fails with 413 | The host's body-size limit (Vercel 4.5 MB, or a proxy) is below the app's 5 MB |
| Google button missing | Both Google variables must be set; redeploy |
| Google `redirect_uri_mismatch` | Register the exact callback address (Section 8) |
| `/admin` asks for a setup code that is not set | Set `ADMIN_SETUP_CODE`, redeploy, create the administrator |

Remove passwords, tokens and connection strings from any log you share.

## 12. References

Checked 14 October 2026.

- Railway: https://docs.railway.com
- Vercel, Express: https://vercel.com/docs/frameworks/backend/express
- Vercel, function limits: https://vercel.com/docs/functions/limitations
- Vercel, Postgres (moved to Neon): https://vercel.com/docs/postgres
- Cloudflare Containers: https://developers.cloudflare.com/containers/get-started/
- Cloudflare Containers pricing and limits: https://developers.cloudflare.com/containers/pricing/ , https://developers.cloudflare.com/containers/platform/limits/
- Cloudflare, adding a domain: https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/
- Cloudflare, proxy status: https://developers.cloudflare.com/dns/proxy-status/
- Neon: https://neon.com/docs
- node-postgres TLS: https://node-postgres.com/features/ssl
- Google OAuth for web servers: https://developers.google.com/identity/protocols/oauth2/web-server
