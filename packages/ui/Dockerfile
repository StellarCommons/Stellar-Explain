# Fix: Dockerfile now builds the UI package, not the Rust backend (#1323)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/ui/package*.json ./packages/ui/
RUN npm ci --workspace=packages/ui
COPY packages/ui ./packages/ui
RUN npm run build --workspace=packages/ui

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/ui/.next ./packages/ui/.next
COPY --from=builder /app/packages/ui/package.json ./packages/ui/package.json
EXPOSE 3000
CMD ["node", "packages/ui/node_modules/.bin/next", "start", "packages/ui"]
