# @stellar-explain/analytics

Analytics client for Stellar Explain.

This package was reset and is being rebuilt from scratch. Work is tracked as a sequence of
issues labeled `analytics`, titled "Analytics #1" through "Analytics #125", each building on
the one before it, starting from this foundation.

## Documentation

- [Architecture](./ARCHITECTURE.md) — pipeline, module boundaries, and HTTP
  ingest contract.
- [Dashboard API](./DASHBOARD_API.md) — ingest endpoint request/response contract
  and summary query interface.
- [Runbook](./RUNBOOK.md) — diagnosing stuck circuit breakers, growing dead-letter
  queues, and missing production events.
- [Changelog](./CHANGELOG.md) — release history.
- [Changeset policy](../../.changeset/README.md) — required for package changes.

## Development

```bash
npm install
npm run build
npm test
npm run lint
```

After optional sampling, `track()` validates properties, applies
`limitPayload` and PII scrubbing, enforces the rate limit, calls `beforeSend`,
and enqueues the event. `flush()` runs queued events through middleware and
sends each one through the configured emitter(s). Inspect state with
`getQueue().size`, `getDeadLetter().size`, and `getCircuitState()`.
