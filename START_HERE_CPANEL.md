# Picking Price — upload package

This is the full source export plus a built portable frontend from source commit
`fc283a5219da33991968c835641bfadb58ef13b0`, packaged 28 September 2026.

## Installation

1. Confirm your plan supports Node.js (project minimum 22.13), pnpm 11.25.0,
   PostgreSQL, and a custom Node startup file or managed command. PHP/MySQL-only
   hosting cannot run this edition.
2. Upload the ZIP into your account home, outside `public_html`, and extract it.
   The ZIP contains a single `picking-price/` folder. Set that folder—not its
   parent—as the application root.
3. Use a dedicated HTTPS domain/subdomain at `/`. Do not deploy into a URL subfolder.
4. Create a PostgreSQL database/user and persistent upload directory. Set
   `DATABASE_URL`, `APP_ORIGIN`, and `UPLOADS_DIR` in the panel. The supplied
   `cpanel.env.example` contains placeholders only. If copying it to a private
   file, replace every placeholder and set `PP_ENV_FILE` to its absolute path.
5. Activate the host's Node environment. From the application root run:

   ```bash
   pnpm install --frozen-lockfile --prod=false
   ```

   Keep dev dependencies: the runtime uses `tsx`. Do not upload desktop
   `node_modules`, use a generic npm-install button, or overwrite a host-managed
   dependency directory. Ask the host for its supported pnpm setup if needed.
6. `server/public/` already contains the built frontend. To rebuild after edits:

   ```bash
   pnpm build:postgres
   ```

7. Create the administrator using the private environment and password-prompt
   procedure in `DEPLOYMENT_GUIDE.md`. Migrations apply automatically. No default
   administrator password is supplied. Run migrations/admin setup once before
   starting concurrent workers.
8. For Passenger, select **passenger.cjs** as the custom startup file. The host
   may need to configure PassengerStartupFile if the panel only accepts app.js.
   For managed command hosting, use `node --import tsx server/index.ts` with
   panel environment variables, or the guide's explicit `--env-file` command.
   `PP_ENV_FILE` is supported by the packaged Passenger wrapper only.
9. Start/restart from the panel and run the guide's acceptance checklist.

Do not use the default `pnpm start`/`pnpm build` scripts on cPanel: those are
retained with the original source for its Workers edition. Use the `:postgres`
scripts above. Your hosting provider still needs to validate Passenger support.

## Included

- Application/backend/UI source, lockfile, schema migrations and tests.
- Sample product images and prebuilt frontend in `server/public/`.
- `passenger.cjs`, a placeholder configuration template and the full guide.
- User, seller and administrator guides in `docs/`.

## Intentionally excluded

Real environment files and credentials, installed dependencies, Git history,
local caches, uploaded user media and database data.
This is a fresh-install package, not a backup or migration of live user data.

No cPanel account was accessed. Build/API checks are local evidence, not a claim
of successful deployment to your hosting account. Configure real Google keys
and payment instructions yourself.
