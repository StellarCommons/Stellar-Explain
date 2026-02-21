# ── Build Stage ──────────────────────────────────────────────────────────────
FROM rust:1.85-alpine AS builder

RUN apk add --no-cache \
    pkgconfig make musl-dev openssl-dev openssl-libs-static

WORKDIR /app

# Copy manifests and source together — Cargo needs src/ to parse targets
COPY packages/core/Cargo.toml packages/core/Cargo.lock ./
COPY packages/core/src ./src

RUN cargo fetch
RUN cargo build --release

# ── Runtime Stage ─────────────────────────────────────────────────────────────
FROM alpine:3.22

RUN apk add --no-cache tini ca-certificates wget

COPY --from=builder /app/target/release/stellar-explain-core /usr/local/bin/stellar-explain-core

RUN chmod +x /usr/local/bin/stellar-explain-core

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

ENTRYPOINT ["tini", "--", "stellar-explain-core"]
