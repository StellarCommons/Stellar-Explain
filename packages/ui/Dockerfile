# ── Dependencies Stage ────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY packages/ui/package.json packages/ui/package-lock.json* ./

RUN npm ci

# ── Build Stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY packages/ui .

# API_URL is a server-side variable — safe to pass at build time
ARG API_URL=http://backend:4000
ENV API_URL=$API_URL

RUN npm run build

# ── Runtime Stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy only what's needed to run
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
