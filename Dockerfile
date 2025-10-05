FROM rust:1.90-alpine3.22 AS builder

RUN apk update && apk add --no-cache \
    pkgconfig make musl-dev openssl-dev openssl-libs-static postgresql-dev

COPY /packages/core/Cargo.toml /packages/core/Cargo.lock ./

RUN cargo fetch

COPY . .

RUN cd /packages/core && cargo build --bin core --release

FROM alpine:3.22

RUN apk update && apk add --no-cache \
    tini ca-certificates

COPY --from=builder /packages/core/target/release/core /usr/local/bin/

RUN chmod +x /usr/local/bin/core

EXPOSE 3000


HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://0.0.0.0:${PORT:-3000}/health || exit 1

ENTRYPOINT ["tini", "--", "core"]

CMD []
