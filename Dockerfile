# Container image for the Node.js + Express + PostgreSQL edition (Railway and similar hosts).
# The default `pnpm build` / `pnpm start` scripts belong to the Cloudflare Workers edition and are not used here.
FROM node:24-slim
WORKDIR /app
RUN npm install --global pnpm@11.25.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# Development dependencies are needed too: Vite builds the frontend and tsx runs the server.
RUN pnpm install --frozen-lockfile

COPY . .
# Public browser key for location detection; optional. Railway passes the service variable in as a build argument.
ARG NEXT_PUBLIC_GOOGLE_MAPS_KEY=""
RUN NEXT_PUBLIC_GOOGLE_MAPS_KEY="$NEXT_PUBLIC_GOOGLE_MAPS_KEY" pnpm build:postgres

ENV NODE_ENV=production
EXPOSE 3000
# Listens on $PORT. Needs DATABASE_URL; see DEPLOYMENT_GUIDE.md ("Railway").
CMD ["node", "--import", "tsx", "server/index.ts"]
