# ── Stage 1: build ────────────────────────────────────────────────────────────
# Bundles the server + all @vajra/* workspace packages into a single ESM file
# using esbuild. npm packages (fastify, etc.) stay external in node_modules.
FROM node:20-alpine AS builder

# native addon build tools (better-sqlite3 needs them even though it's external —
# pnpm install will compile it, and we copy the compiled binary to the runtime stage)
RUN apk add --no-cache python3 make g++

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

# ── Dependency layer (cached unless lockfile changes) ────────────────────────
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json       apps/server/package.json
COPY packages/shared/package.json   packages/shared/package.json
COPY packages/agent-core/package.json packages/agent-core/package.json
COPY packages/models/package.json   packages/models/package.json
COPY packages/tools/package.json    packages/tools/package.json

RUN pnpm install --frozen-lockfile

# ── Source layer ─────────────────────────────────────────────────────────────
COPY tsconfig.base.json tsconfig.node.json ./
COPY packages/shared/src     packages/shared/src
COPY packages/agent-core/src packages/agent-core/src
COPY packages/models/src     packages/models/src
COPY packages/tools/src      packages/tools/src
COPY apps/server/src         apps/server/src
COPY apps/server/build.mjs   apps/server/build.mjs
COPY apps/server/tsconfig.json apps/server/tsconfig.json

# Build: esbuild resolves all @vajra/* workspace packages directly from their
# TypeScript source via alias — no need to pre-build workspace packages first.
RUN pnpm --filter=@vajra/server build

# ── Stage 2: production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN apk add --no-cache python3 make g++ wget

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

# Only production deps needed — mainly fastify, better-sqlite3 native binary
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json       apps/server/package.json
COPY packages/shared/package.json   packages/shared/package.json
COPY packages/agent-core/package.json packages/agent-core/package.json
COPY packages/models/package.json   packages/models/package.json
COPY packages/tools/package.json    packages/tools/package.json

RUN pnpm install --frozen-lockfile --prod

# Copy the single bundled output from builder
COPY --from=builder /app/apps/server/dist apps/server/dist

RUN addgroup -S vajra && adduser -S vajra -G vajra
USER vajra

WORKDIR /app/apps/server

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    CORS_ORIGIN=http://localhost

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
