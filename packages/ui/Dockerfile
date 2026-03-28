# ─────────────────────────────────────────────────────────────
# Builder stage
# ─────────────────────────────────────────────────────────────
FROM rust:latest AS builder

WORKDIR /app

# Cache dependencies
COPY Cargo.toml Cargo.lock ./
COPY packages/core/Cargo.toml packages/core/Cargo.toml

RUN mkdir -p packages/core/src \
    && echo "fn main() {}" > packages/core/src/main.rs

RUN cargo build --release -p core

# Build actual source
COPY . .
RUN cargo build --release -p core

# ─────────────────────────────────────────────────────────────
# Runtime stage
# ─────────────────────────────────────────────────────────────
FROM debian:slim

RUN apt-get update \
    && apt-get install -y ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/core /usr/local/bin/app

EXPOSE 4000

ENV RUST_LOG=info

CMD ["app"]