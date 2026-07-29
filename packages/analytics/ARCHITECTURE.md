# Analytics Architecture

## Pipeline Overview

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Event   │ →  │ Emitter  │ →  │ Queue    │ →  │ Flush    │ →  │  Sinks   │
│ Creation │    │          │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                        │                            │
                                        ▼                            ▼
                                 ┌──────────┐              ┌──────────────────┐
                                 │ DLQ      │              │ Console / HTTP   │
                                 │ (Failed) │              │ File Sink        │
                                 └──────────┘              └──────────────────┘
                                                                      │
                                                                      ▼
                                                            ┌──────────────────┐
                                                            │  Backend Ingest  │
                                                            │  POST /analytics │
                                                            └──────────────────┘
                                                                      │
                                                                      ▼
                                                            ┌──────────────────┐
                                                            │  Event Store     │
                                                            │  (In-Memory)     │
                                                            └──────────────────┘
                                                                      │
                                                                      ▼
                                                            ┌──────────────────┐
                                                            │  Dashboard API   │
                                                            │  GET /summary    │
                                                            └──────────────────┘
```

## Components

### Event Creation
Events are created by calling code (frontend, CLI, or backend) with a name,
timestamp, optional properties, and a session ID.

### Emitter (`EventEmitter`)
Manages event handlers and queues events for delivery. Supports `on`/`off`
for event type subscriptions.

### Queue
Events are buffered in memory before being flushed to sinks. Queue size
can be monitored via `queueSize()`.

### Flush
Events are drained from the queue and delivered to registered sinks in FIFO
order. Flush runs automatically on each `track()` call.

### Sinks
Sinks receive events for external delivery. Built-in sinks:
- `ConsoleSink` — logs to stdout
- `HttpSink` — sends via HTTP POST

### Dead Letter Queue (DLQ)
Events that fail sink delivery are moved to a DLQ. They can be replayed
once the underlying issue is resolved.

### Backend Ingest
The Rust backend exposes `POST /analytics/ingest` to receive events from
CLI and external sources. Events are validated and stored.

### Dashboard API
Read-only REST endpoints (`/analytics/summary`, `/analytics/timeseries`,
etc.) expose aggregated metrics.
