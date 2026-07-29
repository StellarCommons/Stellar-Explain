# Analytics Pipeline Runbook

## How to check DLQ size

The Dead Letter Queue stores events that failed delivery to sinks.

```bash
# The DLQ is exposed via the emitter metrics
# Look for totalDropped in the metrics output
```

## How to replay failed batches

1. Inspect the DLQ for failed events.
2. Fix the underlying issue (network, sink config, etc.).
3. Call `dlq.replayDlq(sink)` to re-deliver all queued events.

## How to drain the ingest backlog

If the ingest endpoint is backed up:

1. Pause the emitter to stop new events.
2. Let the current flush cycle complete.
3. Monitor `queueSize` until it reaches 0.
4. Resume the emitter.

## What to do if the event store fills up

The in-memory event store has a fixed capacity. When full, the oldest events
are evicted automatically (FIFO). To avoid data loss:

- Configure a persistent store (Redis / Postgres) for production use.
- Monitor `store.len()` and set alerts at 80% capacity.
- Increase `max_capacity` if needed.
