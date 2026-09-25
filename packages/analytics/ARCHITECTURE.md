# Analytics package architecture

The `@stellar-explain/analytics` package is a small, browser-safe event
pipeline. It deliberately keeps collection separate from delivery so a slow
or unavailable network cannot block the host application.

```text
host call
   │
   ▼
AnalyticsClient.track()
   │  validate → context/plugins (middleware) → size limit → dedup/sample
   ▼
EventQueue (bounded FIFO)
   │  flush()/timer
   ▼
delivery middleware + sink fan-out
   ├── ConsoleSink
   ├── HttpSink ── fetch + optional gzip + circuit breaker
   └── NoopEmitter
```

## Module responsibilities

| Module                         | Responsibility                                                                                                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client.ts`                    | Public entry point. Validates events, enriches context, applies middleware, queues events, coordinates delivery, exposes metrics/lifecycle listeners, and owns the circuit/dead-letter state. |
| `types.ts`                     | Shared event, lifecycle, and metrics contracts.                                                                                                                                               |
| `config.ts`                    | Resolves safe defaults and normalizes transport/pipeline options.                                                                                                                             |
| `validate.ts`                  | Rejects functions, cycles, and other values that cannot be represented in JSON.                                                                                                               |
| `queue.ts`                     | In-memory FIFO storage with an optional oldest-event eviction cap.                                                                                                                            |
| `dedup.ts`                     | Optional short-window duplicate suppression.                                                                                                                                                  |
| `sampling.ts`                  | Probabilistic pre-queue sampling.                                                                                                                                                             |
| `plugins.ts` / `middleware.ts` | Ordered event transformation and cancellation hooks.                                                                                                                                          |
| `utils/eventSize.ts`           | UTF-8 serialized event measurement and cap checks.                                                                                                                                            |
| `emitter/index.ts`             | Transport contract shared by all sinks.                                                                                                                                                       |
| `sinks/ConsoleSink.ts`         | Development logger sink.                                                                                                                                                                      |
| `sinks/HttpSink.ts`            | JSON ingest transport with batching, headers, retries, compression, and HTTP failure reporting.                                                                                               |
| `sinks/MultiSink.ts`           | Fan-out transport that attempts every configured sink.                                                                                                                                        |
| `lib/logger.ts`                | Normal console methods plus `{ level, event, meta }` structured records.                                                                                                                      |
| `lib/circuitBreaker.ts`        | Closed/open/half-open delivery circuit with cooldown and open-count metrics.                                                                                                                  |

## Delivery lifecycle

1. `track()` validates the event and attaches configured environment/build
   context. The complete event is then size-checked in UTF-8 bytes.
2. Optional deduplication and sampling run before queue insertion. Events
   discarded at either boundary are reflected in `getMetrics().eventsDropped`.
3. `flush()` drains the FIFO queue. A sink with `sendBatch()` receives a batch;
   legacy sinks receive one event at a time. Plugins and `beforeSend` are
   intake middleware and run before queueing; a future delivery middleware
   layer can be inserted at the fan-out boundary without changing the queue
   contract.
4. A sink failure is caught, logged without event properties, counted in
   `eventsFailed`, and retained in the bounded dead-letter list. Other sinks
   still receive the event.
5. Consecutive failures open the circuit. During cooldown, delivery is skipped;
   after cooldown one half-open probe is allowed. A successful probe closes the
   circuit and a failed probe reopens it.

## Runtime considerations

The package is safe to import during SSR: no browser globals are read at module
load, and `fetch` is feature-detected only when an HTTP sink is requested.
`CompressionStream` is likewise detected at send time, so older runtimes fall
back to plain JSON. In Node.js, the auto-flush interval is unreferenced where
supported, preventing analytics from keeping a process alive.

`getMetrics()` returns a fresh snapshot with these primary counters:

- `eventsTracked`
- `eventsDropped`
- `eventsSent`
- `eventsFailed`
- `circuitState` (`undefined` when the configured sink has no circuit)
- `circuitOpenCount`

For compatibility, the snapshot also exposes non-enumerable `tracked`,
`dropped`, `sent`, `failed`, `queueSize`, and `deadLetterCount` aliases.

## HTTP ingest contract

`HttpSink` sends `POST` requests to the configured endpoint with a JSON array:

```json
[
  {
    "name": "page_view",
    "timestamp": 1700000000000,
    "properties": { "path": "/" },
    "context": { "environment": "production", "buildVersion": "1.0.0" }
  }
]
```

The backend accepts a single object or an array and acknowledges accepted
payloads with a 2xx response such as `{ "status": "accepted" }`. Non-2xx
responses and network errors are delivery failures. `Content-Encoding: gzip`
is added only when `CompressionStream` is available and compression succeeds.

## Extending the pipeline

A custom sink only needs to implement `send(event)`. Implement the optional
`sendBatch(events)` method when the transport can efficiently accept multiple
events. Use `client.on()` for lifecycle observations and `client.debug()` to
enable structured stage logging during development.

## Release discipline

Changes to this package require a changeset in the repository-level
`.changeset/` directory. See that directory's README and this package's
`CHANGELOG.md` for the release process.
