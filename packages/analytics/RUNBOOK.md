# Analytics Pipeline Production Runbook

This runbook provides diagnostic and remediation procedures for the `@stellar-explain/analytics` event pipeline. It focuses on three common production failure modes:

1. [Stuck Circuit Breaker](#1-stuck-circuit-breaker)
2. [Growing Dead-Letter Queue](#2-growing-dead-letter-queue)
3. [Missing Events in Production](#3-missing-events-in-production)

## Architecture Quick Reference

```text
Application Call
    │
    ▼
AnalyticsClient.track(name, properties)
    │  [1] Optional sampling (sampleRate, default 1.0)
    │  [2] Validate name and properties
    │  [3] limitPayload (maxPropertyBytes: 1024)
    │  [4] scrubPii (enabled by default)
    │  [5] Rate limit (maxEventsPerSecond: 100)
    │  [6] beforeSend
    ▼
EventQueue (FIFO, maxQueueSize: 100)
    │  flush()
    ▼
middleware → circuit check → emitter.send()
    │
    └── failures or open circuit → DeadLetterQueue (max 100)
```

## 1. Stuck Circuit Breaker

### Background

The circuit breaker has three states: `closed`, `open`, and `half-open`. By
default it opens after `5` consecutive delivery failures, waits `30,000`ms,
then allows one half-open probe. A successful probe closes the circuit; a
failed probe reopens it.

The client uses its own breaker during `flush()`. `getCircuitState()` reports
the configured emitter's breaker (for example, `HttpSink`) and returns
`undefined` when the emitter has no breaker.

### Symptoms

- `client.getCircuitState()` returns `'open'`.
- `client.getQueue().size` grows while delivery is paused.
- `client.getDeadLetter().size` increases.
- Events stop appearing at the ingest endpoint even though calls to `track()`
  continue.

### Diagnostic Steps

#### Step 1: Inspect Client State

Pass the application's `AnalyticsClient` instance to:

```javascript
function reportHealth(client) {
  console.log('Emitter circuit:', client.getCircuitState());
  console.log('Client circuit:', client.getCircuitBreaker().getState());
  console.log('Queue size:', client.getQueue().size);
  console.log('Dead-letter size:', client.getDeadLetter().size);
}
```

#### Step 2: Verify Network & Upstream Ingest Availability

```bash
curl -i -X POST "https://api.stellar-explain.org/analytics/events" \
  -H "Content-Type: application/json" \
  -d '[{"name":"ping","timestamp":'$(date +%s)'}]'
```

Expected response:

```http
HTTP/2 200 (or 202)
Content-Type: application/json

{"status":"accepted"}
```

Possible HTTP failure codes:

| HTTP Status | Cause | Action |
|-------------|-------|--------|
| `400 Bad Request` | Timestamp more than one hour in the future, or invalid JSON | Check clocks and payload serialization; timestamps must be Unix seconds. |
| `413 Payload Too Large` | Request body over 512 KB or a batch over 100 events | Reduce batch size or property sizes; batches are bounded by count and serialized bytes. |
| `401 / 403 Forbidden` | Missing or invalid `ANALYTICS_WRITE_TOKEN` | Verify the authorization header in the proxy or `HttpSinkOptions`. |
| `404 Not Found` | Endpoint misconfigured | Check API routing and client config. |
| `502 / 503 / 504` | Upstream ingest service or database down | Inspect core backend logs and container health. |
| `CORS Error` | Missing `Access-Control-Allow-Origin` on `OPTIONS` / `POST` | Check the CORS layer in `packages/core/src/main.rs`. |

### Remediation & Recovery

1. Resolve the upstream network, ingest, or CORS failure.
2. Recreate the client to reset all in-memory circuit state, then resume
   tracking.
3. Once the circuit is closed, replay dead-letter events as described below.

## 2. Growing Dead-Letter Queue

### Background

The client's `DeadLetterQueue` holds events whose delivery failed or whose
client-side circuit was open during `flush()`. It is capped at `100` events;
when full, the oldest event is evicted.

### Symptoms

- `client.getDeadLetter().size` is approaching or equal to `100`.
- Console warns of dropped oldest events.

### Diagnostic Steps

#### Step 1: Inspect Failed Events

```javascript
const failedEvents = client.getDeadLetter().drain();
console.table(failedEvents.map((event) => ({
  name: event.name,
  timestamp: event.timestamp,
  props: JSON.stringify(event.properties),
})));
```

#### Step 2: Categorize the Failure Pattern

- All events failing with the same error: ingest outage, circuit tripped, or
  incorrect endpoint URL.
- Specific events failing: invalid payload, oversized property values, or a
  timestamp too far in the future.

### Remediation & Recovery

#### Replaying Dead-Letter Events

```javascript
async function replayDeadLetter(client) {
  const events = client.getDeadLetter().drain();
  for (const event of events) {
    client.track(event.name, event.properties);
  }
  await client.flush();
  console.log('Dead-letter size:', client.getDeadLetter().size);
}
```

#### Preventing Dead-Letter Overflow

- Keep `flushIntervalMs` at its default of `5000`ms or lower.
- Keep `maxQueueSize` at `100` and property values within `maxPropertyBytes: 1024` so queue overflow and payload truncation stay visible.

## 3. Missing Events in Production

### Diagnostic Checklist

```text
track() → [1. Sampling?] → [2. Valid name/properties?]
        → [3. limitPayload (1024 bytes)?] → [4. scrubPii?]
        → [5. Rate limit?] → [6. beforeSend null?]
        → [7. Queue (max 100)?] → [8. middleware / circuit?]
        → [9. emitter / ingest?]
```

#### 1. Sampling

`sampleRate` defaults to `1.0`. Lower values intentionally drop events before
validation.

#### 2. Validation

Invalid names, functions, symbols, circular references, and unserializable
properties are rejected by `track()`.

#### 3. Payload Size

`limitPayload()` truncates individual property values over `maxPropertyBytes`
(default `1024`).

#### 4. PII Scrubbing

Values are scrubbed by default. Set `scrubPii: false` only when scrubbing must
be disabled; scrubbing does not drop events.

#### 5. Rate Limiting

`maxEventsPerSecond` defaults to `100`. Events over budget are dropped; inspect
the limiter with `client.getRateLimiter().availableTokens`.

#### 6. beforeSend

A `beforeSend` hook that returns `null` cancels the event before enqueueing.

#### 7. In-Memory Queue

Check `client.getQueue().size`. The queue holds at most `maxQueueSize` events
(default `100`) and evicts the oldest when full.

#### 8. Middleware & Circuit

Check `client.getDeadLetter().size` and `client.getCircuitState()`. Middleware
exceptions and open circuits route events to the dead-letter.

#### 9. Backend Ingest Validation

The route `POST /analytics/events` enforces:

- Body limit: 512 KB.
- Batch limit: 100 events when an array is submitted.
- Timestamps: Unix seconds only, with no more than one hour of future skew.
  The client converts `Date.now()` to seconds at the `HttpSink` boundary.

## Production Inspection Reference

| Check | API | Alert Condition |
|-------|-----|-----------------|
| Emitter circuit state | `client.getCircuitState()` | `'open'` persists |
| Client circuit state | `client.getCircuitBreaker().getState()` | `'open'` persists |
| Pending queue | `client.getQueue().size` | Grows without draining |
| Client dead-letter | `client.getDeadLetter().size` | Sustained growth |
