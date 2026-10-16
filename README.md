# Picking Price

A two-way online marketplace for Pakistan. Sellers post fixed-price listings for new and pre-loved products; buyers either browse those listings or post a request for what they need and let sellers send offers.

Live site: https://web-production-e86b77.up.railway.app

## What it does

- **Accounts**: registration with name, mobile number, email and password (the mobile number is saved to the profile), sign-in with email and password, optional Google sign-in, buyer / seller / both roles.
- **Listings**: title, description, category, brand, price, quantity, condition (New, Like New, Good, Fair, Used), location, up to six photos, delivery and pickup options.
- **Buyer requests**: what the buyer needs, budget, quantity, acceptable condition and location. Every request takes offers for 30 days; if no offer is selected by then it is taken down automatically and the buyer is notified (it can be posted again). Requests can be saved as drafts.
- **Seller offers**: sellers answer a request with a price and details; the buyer compares offers and selects one.
- **Search**: keyword search over title, description, category and brand, with category, condition, city, area and price filters and four sort orders.
- **Wishlist, chat, reviews, reports**: save products, message the other member about a product, request or offer (with read ticks), review a seller after contact, and report a listing, request, message, review or member.
- **Listing slots and promotions**: every seller has a free listing allowance; extra slots and Premium Listings (promotions) are paid outside the site, and the seller sends the payment details (method, transaction ID, sender, amount, date and a receipt screenshot) that the administrator cross-checks before approving. A listing published as a Premium Listing stays hidden until its payment is approved. Promoted products appear in the **Premium Listings** strip.
- **Slider**: a banner of images, videos or YouTube videos at the top of the product pages, managed in the admin panel.
- **Notifications and emails**: in-app for every important event, and by email once the administrator has connected a Gmail account: a welcome email at sign-up, password reset codes, a password-changed notice, and a copy of each notification (new message, offer, review and so on). Opening a chat clears its message notifications; opening the Notifications page clears the rest.
- **Password reset**: a code emailed to the account's address, checked, then a new password; the administrator can issue a code as a fallback.
- **Admin panel** at `/admin`: members, listings, requests, payments (with the payment details beside the price), reports, promotions, reviews, activity log, slider, categories and settings.

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
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Running it on Railway, Vercel, Cloudflare or your own server |

PDF copies of these documents are in `docs/pdf/`, and the diagrams as images in `docs/diagrams/`.

## Technology

One application: a React site built with Vite, served by a Node.js + Express server that keeps its data in PostgreSQL. The same code runs locally and on the live site. Versions checked on 16 October 2026 against the installed packages and the live services.

### Server and data

| Part | Technology | Version | Used for |
|---|---|---|---|
| Language | TypeScript | 5.9.3 | All code, browser and server |
| Runtime | Node.js | 24.18 or newer (live: Docker image `node:24-slim`) | Runs the server |
| TypeScript runner | tsx | 4.23.13 | Runs the server's TypeScript without a compile step |
| Package manager | pnpm | 11.25.0 | Installs the packages from `pnpm-lock.yaml` |
| Web server | Express | 5.2.1 | Pages, API, sign-in, sessions, photo uploads |
| Database | PostgreSQL | 18 on Railway (live), 17.11 locally | All data |
| Database driver | node-postgres (`pg`) | 8.23.0 | Connects the server to PostgreSQL |
| Input checks | Zod | 3.25.76 | Validates every request on the server |
| Passwords | scrypt (Node.js `crypto`) | built into Node.js | Salted password hashes |

### Browser app

| Part | Technology | Version | Used for |
|---|---|---|---|
| Screens | React and React DOM | 19.2.6 | Every page and dialog |
| Build | Vite, with @vitejs/plugin-react | 8.0.13, 6.0.2 | Builds the browser app into `server/public/` |
| Styling | Tailwind CSS, @tailwindcss/postcss, tw-animate-css | 4.2.1, 4.2.1, 1.4.0 | Utility classes and animations, next to the site's own CSS in `app/market/styles.css` |
| Components | Radix UI, with shadcn/ui components | 1.6.7 (shadcn theme 4.13.0) | Dialogs, selects, switches, tables, pagination (`components/ui/`) |
| Icons | Lucide React | 1.31.0 | All icons |
| Messages | Sonner | 2.0.8 | Short pop-up messages ("Saved successfully") |
| Class helpers | class-variance-authority, clsx, tailwind-merge | 0.7.1, 2.1.1, 3.6.0 | Combining CSS classes in components |

### Services

| Service | Used for |
|---|---|
| Railway | Hosting: the `web` service runs the `Dockerfile`, a PostgreSQL service holds the data, a volume keeps the photos |
| GitHub | Source code; every push to `main` redeploys the live site |
| Google OAuth 2.0 / OpenID Connect | "Continue with Google" (scopes `openid email profile`, with PKCE) |
| Gmail API | Sending emails (permission to send only) from the site's Gmail account; Resend is an optional fallback |
| Google Search Console | Proves ownership of the site for Google's app verification |
| Google Maps Geocoding API | Optional city detection; off until `GOOGLE_MAPS_KEY` is set |

### Development and tests

| Tool | Version | Used for |
|---|---|---|
| ESLint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, globals | 9.39.4, 9.39.4, 8.59.3, 7.1.1, 16.4.0 | `npm run lint` |
| PGlite | 0.5.8 | In-memory PostgreSQL for the tests |
| Node.js test runner and assertion scripts | built into Node.js | `npm test` |
| Type definitions | @types/node 22.19.19, @types/express 5.0.6, @types/pg 8.23.1, @types/react 19.2.14, @types/react-dom 19.2.3 | Editor and lint type information |

## Project structure

| Path | Contents |
|---|---|
| `client/` | Entry point of the browser app: picks the screen from the address |
| `app/market/` | The screens (React): home, product lists, product page, forms, dashboards, chat, admin panel, styles |
| `app/pages/` | The Login, Sign-up, Forgot Password, Privacy Policy and Terms of Service pages |
| `app/` | The sign-in and sign-up form, the legal text (also used by the server), sample products, global styles |
| `components/ui/` | Shared dialog, button, select, switch, table and pagination components |
| `lib/market/` | The marketplace rules: listings, requests, offers, chat, reviews, payments, promotions, admin, email |
| `lib/auth/` | Password hashing |
| `server/` | The Express server: sign-in, sessions, photo uploads, database connection, migrations |
| `drizzle/` | Database tables (SQL), applied automatically when the server starts |
| `public/` | Logo, icon and sample product images |
| `scripts/` | Starts the local PostgreSQL server for `npm run dev` |
| `tests/` | Automated tests |
| `Dockerfile` | Container image used by Railway |

## Running it locally

Requires Node.js 24.18 or newer (https://nodejs.org), pnpm (`npm install --global pnpm@11.25.0`) and PostgreSQL 17 (https://www.postgresql.org/download/).

```bash
pnpm install
npm run dev
```

Open http://localhost:3000 (use exactly this address). `npm run dev` builds the site, starts the project's own PostgreSQL server if it is not running, then starts the site with the settings in `.env`. Without the build step: `npm run start:local`. Stop it with Ctrl+C.

### The local database

The site uses its own PostgreSQL server kept in the `.postgres` folder, on port 5433, so it never touches a PostgreSQL installed on the computer (usually on 5432). Only PostgreSQL's programs are used; set `PG_BIN` if they are not in `C:\Program Files\PostgreSQL\17\bin`. To set it up on a new computer, once:

```bash
initdb -D .postgres/data -U picking -W --auth=scram-sha-256 -E UTF8 --locale=C
# add "port = 5433" and "listen_addresses = 'localhost'" to .postgres/data/postgresql.conf
pg_ctl start -D .postgres/data -l .postgres/server.log
createdb -h 127.0.0.1 -p 5433 -U picking picking_price
```

Then create `.env` in the project folder:

```dotenv
DATABASE_URL=postgresql://picking:PASSWORD@127.0.0.1:5433/picking_price
APP_ORIGIN=http://localhost:3000
PORT=3000
UPLOADS_DIR=server/uploads
ADMIN_SETUP_CODE=a-private-phrase-of-16-or-more-characters
```

The tables are created when the site first starts. To create the administrator, open http://localhost:3000/admin and enter the setup code with the email and password you want (see [AUTH_SETUP.md](AUTH_SETUP.md)). Stop the database with `pg_ctl stop -D .postgres/data`; delete the `.postgres` folder to start with an empty database.

All settings are environment variables; the full list is in [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#environment-variables). `.env` is never committed.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Build, then start the local site and its database |
| `npm run start:local` | Start the local site and its database without building |
| `npm run build` | Build the browser app into `server/public/` |
| `npm start` | Start the server with the environment's settings (used by hosting) |
| `npm run admin:create` | Create the administrator from `ADMIN_EMAIL` and `ADMIN_PASSWORD` instead of the setup code |
| `npm run lint` | Check the code |
| `npm test` | Run all tests |

## Tests

| Command | Checks |
|---|---|
| `npm run test:password` | Password hashing and verification |
| `npm run test:market` | The marketplace rules on PostgreSQL: permissions, limits, search, offers, payments, promotions |
| `npm run test:http` | The Express server through real HTTP requests: sign-in, uploads, password reset, emails, chat and notification counts (run `npm run build` first) |

All tests use throwaway in-memory PostgreSQL databases; they never touch the local or live data.

## First settings after installing

Sign in at `/admin` and open **Settings**: enter the payment instructions sellers should follow (bank or mobile wallet details), and adjust the free listing allowance (default 10), the price of an extra slot (default Rs. 50), and the three promotion lengths and prices if needed. Until payment instructions are saved, sellers cannot submit a slot or promotion request.
