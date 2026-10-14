# Container image for Picking Price (Node.js + Express + PostgreSQL), used by Railway and any Docker host.
FROM node:24-slim
WORKDIR /app
RUN npm install --global pnpm@11.25.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# Development dependencies are needed too: Vite builds the frontend.
RUN pnpm install --frozen-lockfile

COPY . .
# Public browser key for location detection; optional. Railway passes the service variable in as a build argument.
ARG GOOGLE_MAPS_KEY=""
RUN GOOGLE_MAPS_KEY="$GOOGLE_MAPS_KEY" pnpm build

ENV NODE_ENV=production
EXPOSE 3000
# Listens on $PORT. Needs DATABASE_URL; see DEPLOYMENT_GUIDE.md ("Railway").
CMD ["node", "--import", "tsx", "server/index.ts"]
