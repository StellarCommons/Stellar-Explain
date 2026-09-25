# @stellar-explain/analytics

Analytics client for Stellar Explain.

This package was reset and is being rebuilt from scratch. Work is tracked as a sequence of
issues labeled `analytics`, titled "Analytics #1" through "Analytics #125", each building on
the one before it, starting from this foundation.

## Documentation

- [Architecture](./ARCHITECTURE.md) — pipeline, module boundaries, metrics, and
  HTTP ingest contract.
- [Changelog](./CHANGELOG.md) — release history.
- [Changeset policy](../../.changeset/README.md) — required for package changes.

## Development

```bash
npm install
npm run build
npm test
npm run lint
```

The client validates and enriches events before queueing, then delivers them
through one or more sinks. `HttpSink` supports bounded batches, custom headers,
optional gzip compression, retries, and a circuit breaker. Use
`client.getMetrics()` and `client.on()` to inspect pipeline health.
