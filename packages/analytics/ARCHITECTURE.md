# Analytics package architecture

The `@stellar-explain/analytics` package is a small, browser-safe event
pipeline. It deliberately keeps collection separate from delivery so a slow
or unavailable network cannot block the host application.

```text
host call
   │
   ▼
AnalyticsClient.track()
   │  validate → limitPayload → scrubPii → rate limit → beforeSend
   ▼
EventQueue (bounded FIFO)
   │  flush()
   ▼
middleware → emitter send
   ├── ConsoleSink
   ├── HttpSink ── fetch + circuit breaker
   └── NoopEmitter
```

## Module responsibilities

| Module                         | Responsibility                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `client.ts`                    | Runs the intake pipeline, queues events, drains them on flush, and exposes inspection helpers.        |
| `types.ts`                     | Shared event and configuration contracts.                                                            |
| `config.ts`                    | Resolves defaults (`maxQueueSize: 100`, `maxPropertyBytes: 1024`) and normalizes options.              |
| `validate.ts`                  | Rejects functions, cycles, and other values that cannot be represented in JSON.                       |
| `queue.ts`                     | In-memory FIFO storage with an oldest-event eviction cap.                                            |
| `sampling.ts`                  | Optional pre-queue probabilistic sampling.                                                           |
| `plugins.ts` / `middleware.ts` | Ordered `beforeSend` and delivery hooks.                                                             |
| `emitter/index.ts`             | Emitter contract shared by all sinks.                                                                |
| `sinks/ConsoleSink.ts`         | Development logger sink.                                                                             |
| `sinks/HttpSink.ts`            | JSON fetch transport with custom headers, retries, optional beacon, and circuit state.               |
| `sinks/MultiSink.ts`           | Fan-out transport that sends to every configured emitter.                                            |
| `lib/logger.ts`                | Console and structured logging; enabled by `debug: true`.                                            |
| `lib/circuitBreaker.ts`        | Closed/open/half-open delivery guard with cooldown and open-count state.                              |

## Delivery lifecycle

1. After the optional sampling gate, `track()` validates the event name and
   properties, bounds each property value with `limitPayload()`
   (`maxPropertyBytes: 1024`), scrubs PII by default, applies the token-bucket
   rate limit (`maxEventsPerSecond: 100`), and calls `beforeSend`. Returning
   `null` from `beforeSend` cancels the event; otherwise it is enqueued.
 2. `flush()` drains the FIFO queue. Each event passes through the middleware
    pipeline, then the configured emitter's `sendBatch()` method receives the
    processed events when available; emitters without batch support receive
    one `send()` call per event.
3. A delivery failure is logged, counted by the circuit breaker, and retained
   in the bounded dead-letter list. When the client-side circuit is open,
   queued events are routed to the dead-letter without a send attempt.
4. Consecutive failures open the circuit. During cooldown, delivery is
   skipped; after cooldown one half-open probe is allowed. A successful probe
   closes the circuit and a failed probe reopens it.

## Runtime considerations

The package is safe to import during SSR: no browser globals are read at module
load, and `fetch` is resolved only when an HTTP sink sends. In Node.js, the
auto-flush interval is unreferenced where supported, preventing analytics from
keeping a process alive.

## Inspection helpers

- `client.getQueue().size` — events currently queued.
- `client.getDeadLetter().size` — failed events retained by the client.
- `client.getCircuitState()` — the configured emitter's circuit state, or
  `undefined` when the emitter has no circuit.

## HTTP ingest contract

`HttpSink` sends `POST` requests to the configured endpoint with a single
event object, or a bounded JSON array when batch delivery is used:

```json
{
  "name": "page_view",
  "timestamp": 1700000000,
  "properties": { "path": "/" }
}
```

The backend accepts a single object or an array and acknowledges accepted
payloads with a 2xx response such as `{ "status": "accepted" }`. Timestamps
are Unix seconds: the client converts `Date.now()` to seconds before sending,
and millisecond timestamps are not accepted. Non-2xx responses and network
errors are delivery failures.

## Extending the pipeline

A custom emitter only needs to implement `send(event)`. Register plugins with
`client.registerPlugin()` to add ordered `beforeSend` hooks. Set `debug: true`
in the client configuration to enable stage logging.

## Release discipline

Changes to this package require a changeset in the repository-level
`.changeset/` directory. See that directory's README and this package's
`CHANGELOG.md` for the release process.
