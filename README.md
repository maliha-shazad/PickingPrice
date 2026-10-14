# Picking Price

A two-way online marketplace for Pakistan. Sellers post fixed-price listings for new and pre-loved products; buyers either browse those listings or post a request for what they need and let sellers send offers.

Live site: https://web-production-e86b77.up.railway.app

## What it does

- **Accounts**: registration and sign-in with email (or phone number) and password, optional Google sign-in, buyer / seller / both roles.
- **Listings**: title, description, category, brand, price, quantity, condition (New, Like New, Good, Fair, Used), location, up to six photos, delivery and pickup options.
- **Buyer requests**: what the buyer needs, budget, quantity, acceptable condition, location and an expiry date. Requests can be saved as drafts.
- **Seller offers**: sellers answer a request with a price and details; the buyer compares offers and selects one.
- **Search**: keyword search over title, description, category and brand, with category, condition, location and price filters and four sort orders.
- **Wishlist, chat, reviews, reports**: save products, message the other member about a product, request or offer, review a seller after contact, and report a listing, request, message, review or member.
- **Listing slots and promotions**: every seller has a free listing allowance; extra slots and featured promotions are requested with a manual payment reference that the administrator approves.
- **Notifications**: in-app for every important event, and by email once the administrator has connected a Gmail account.
- **Password reset**: a code emailed to the account's address, checked, then a new password; the administrator can issue a code as a fallback.
- **Admin panel** at `/admin`: members, listings, requests, payments, reports, promotions, reviews, activity log, categories and settings.

Out of scope by design: online product payments, orders, delivery management, wallets and auctions. Buyers and sellers agree the deal between themselves.

## Guides

| Document | For |
|---|---|
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Buyers and every new member |
| [docs/SELLER_GUIDE.md](docs/SELLER_GUIDE.md) | Sellers |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | The administrator |
| [docs/API.md](docs/API.md) | Developers: every API endpoint, its inputs and rules |
| [docs/ANALYSIS_MODELS.md](docs/ANALYSIS_MODELS.md) | Context model, marketplace flows and entity-relationship diagram |
| [AUTH_SETUP.md](AUTH_SETUP.md) | Accounts, Google sign-in, the administrator account and notification emails |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Installing on Railway, a local server or cPanel |

PDF copies of these documents are in `docs/pdf/`, and the diagrams as images in `docs/diagrams/`.

## Project structure

| Path | Contents |
|---|---|
| `app/market/` | The user interface (React): pages, forms, dashboards, admin panel, styles |
| `lib/market/` | The marketplace rules shared by both editions: listings, requests, offers, chat, reviews, payments, promotions, admin, email |
| `server/` | The Express + PostgreSQL server: sign-in, uploads, migrations |
| `client/` | Entry point of the single-page build served by Express |
| `app/api/`, `lib/auth/` | The same API on Cloudflare Workers (D1 database, R2 storage), used for local development |
| `drizzle/` | Database schema migrations |
| `tests/` | Automated tests |

The project has two editions that share the same screens and rules:

- **Express + PostgreSQL edition**: React, Node.js, Express and PostgreSQL. This is the edition that is deployed (see `Dockerfile`).
- **Workers edition**: the same application on the Cloudflare Workers runtime with a local D1 database and R2 bucket. It needs no database server, so it is convenient for development.

## Running it locally

There are two ways. Both start from the source folder (without `node_modules`, which is downloaded again).

### With Node.js

Requires Node.js 24.18 or newer (https://nodejs.org).

```bash
npm install

# Express + PostgreSQL edition, the same as the live site: http://localhost:3000
npm run dev

# Workers edition (no database server needed): http://127.0.0.1:8787
npm run dev:workers
```

`npm run dev` builds the site, starts the project's own PostgreSQL server if it is not running, then starts the site with the settings in `.env`. Without a build step: `npm run start:local`.

Settings are read from environment variables: `DATABASE_URL`, `APP_ORIGIN`, `PORT`, `UPLOADS_DIR`, `ADMIN_SETUP_CODE`, and the optional `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` (or `RESEND_API_KEY` with `EMAIL_FROM`). For the Workers edition copy `dev.vars.example` to `.dev.vars` in the project folder and edit it. Never commit real values.

The Workers edition keeps its database and uploaded photos in the `.wrangler` folder. The first `npm start` creates the database tables by itself (`scripts/local-db.mjs`); delete the `.wrangler` folder to start empty again.

#### Local PostgreSQL

The Express edition uses its own PostgreSQL server kept in the `.postgres` folder, on port 5433, so it never touches a PostgreSQL installed on the computer (usually on 5432). It needs PostgreSQL 17 installed (only its programs are used; set `PG_BIN` if they are not in `C:\Program Files\PostgreSQL\17\bin`). To set it up on a new computer:

```bash
initdb -D .postgres/data -U picking -W --auth=scram-sha-256 -E UTF8 --locale=C
# add "port = 5433" and "listen_addresses = 'localhost'" to .postgres/data/postgresql.conf
pg_ctl start -D .postgres/data -l .postgres/server.log
createdb -h 127.0.0.1 -p 5433 -U picking picking_price
```

Then put `DATABASE_URL=postgresql://picking:PASSWORD@127.0.0.1:5433/picking_price`, `APP_ORIGIN=http://localhost:3000` and `ADMIN_SETUP_CODE` in `.env`. The tables are created when the site first starts. Stop the server with `pg_ctl stop -D .postgres/data`; delete the `.postgres` folder to start empty again.

### With Docker

Requires Docker Desktop only; Node.js and PostgreSQL run inside the containers.

```bash
docker compose up --build
```

Then open http://localhost:3000 (use exactly this address). The first run builds the image and takes several minutes. The administrator setup code for this local run is in `docker-compose.yml`.

To create the administrator, set `ADMIN_SETUP_CODE` (16 characters or more), open `/admin` and enter the code with the email and password you want. See [AUTH_SETUP.md](AUTH_SETUP.md).

## Tests

| Command | Checks |
|---|---|
| `npm run test:market` | The marketplace rules against both PostgreSQL and D1: permissions, limits, search, offers, payments, promotions |
| `npm run test:http` | The Express server through real HTTP requests on an embedded PostgreSQL database (run `npm run build:postgres` first) |
| `npm run test:auth` | Sign-up, sign-in, sessions and uploads on the Workers runtime (run `npm run build` first) |
| `npm run test:password` | Password hashing and verification |

All tests use throwaway local databases; they never touch real accounts.

## First settings after installing

Sign in at `/admin` and open **Settings**: enter the payment instructions sellers should follow (bank or mobile wallet details), and adjust the free listing allowance (default 10), the price of an extra slot (default Rs. 50), and the three promotion lengths and prices if needed. Until payment instructions are saved, sellers cannot submit a slot or promotion request.
