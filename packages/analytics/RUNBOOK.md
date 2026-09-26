# Analytics Pipeline Production Runbook

This runbook provides diagnostic and remediation procedures for the `@stellar-explain/analytics` event pipeline. It focuses on the three most common production failure modes:

1. [Stuck Circuit Breaker](#1-stuck-circuit-breaker) (#81, #82, #83, #94)
2. [Growing Dead-Letter Queue](#2-growing-dead-letter-queue) (#91)
3. [Missing Events in Production](#3-missing-events-in-production)

---

## Architecture Quick Reference

```text
Application Call
    │
    ▼
AnalyticsClient.track(name, properties)
    │  [1] Opt-Out & Disabled Check (optOutManager, provider disabled)
    │  [2] Event Validation (reject functions, circular refs)
    │  [3] PII Scrubbing (emails -> [email], card/phone numbers -> [long-number])
    │  [4] Rate Limiting (token bucket <= maxEventsPerSecond)
    │  [5] Size Measurement (UTF-8 payload limit)
    │  [6] Deduplication & Probabilistic Sampling (dedupWindowMs, sampleRate)
    ▼
EventQueue (FIFO bounded in-memory queue)
    │  [Unload]: Persists to localStorage on beforeunload (guarded by storageAvailability)
    ▼  [Interval / flush()]: Drains queue
Middleware & Sinks Fan-Out
    │
    ├── CircuitBreaker Check: canPass() / allowRequest()
    │     ├── OPEN: Diverts event immediately to DeadLetterQueue
    │     └── CLOSED / HALF-OPEN: Forwards to Emitter/Sink (HttpSink, MultiSink)
    │           ├── SUCCESS: CircuitBreaker.onSuccess()
    │           └── FAILURE: CircuitBreaker.onFailure() + Push to DeadLetterQueue
```

---

## 1. Stuck Circuit Breaker

### Background (#81, #82, #83, #94)

The analytics transport is protected by a three-state `CircuitBreaker`:
- **`closed`**: Normal state. All flush requests hit the emitter/network.
- **`open`**: Tripped after `failureThreshold` (default `5`, or `3` in strict configurations) consecutive delivery failures. While open, requests are diverted directly to the in-memory `DeadLetterQueue` without making network calls.
- **`half-open`**: Entered after `cooldownMs` (default `30,000`ms to `60,000`ms) has elapsed. Exactly one trial probe is allowed through:
  - If the probe **succeeds**, the breaker closes (`closed`) and normal delivery resumes.
  - If the probe **fails**, the breaker immediately reopens (`open`) for another full cooldown cycle.

### Symptoms
- `client.getCircuitState()` returns `'open'`.
- `client.getCircuitBreaker().getState()` returns `'open'`.
- Pipeline metrics snapshot (`client.getMetrics()`):
  - `circuitState`: `'open'`
  - `circuitOpenCount`: continuously incrementing
  - `eventsFailed`: increasing while `eventsSent` is flat
- Browser console warnings:
  ```text
  [WARN] circuit open — <event_name> deferred to dead-letter
  ```
- Events stop appearing on the backend even though the user is actively interacting with the application.

### Diagnostic Steps

#### Step 1: Inspect Client State in Browser DevTools
Run the following in the browser console:
```javascript
// Access the analytics client instance
const client = window.__ANALYTICS_CLIENT__; // or through React DevTools / hook
console.log('Circuit State:', client.getCircuitState?.() || client.getCircuitBreaker().getState());
console.log('Metrics:', client.getMetrics());
console.log('Dead Letter Queue Size:', client.getDeadLetter().size);
```

#### Step 2: Verify Network & Upstream Ingest Availability
Test the ingest endpoint directly from your terminal:
```bash
# Production ingest endpoint check
curl -i -X POST "https://api.stellar-explain.org/analytics/events" \
  -H "Content-Type: application/json" \
  -d '[{"name":"ping","timestamp":'$(date +%s%3N)'}]'
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
| **`400 Bad Request`** | Clock skew (`timestamp` > 1 hr in future) or invalid JSON | Check client system clock and payload serialization. |
| **`413 Payload Too Large`** | Request body > 512KB or batch array > 100 events | Lower `batchSize` in `HttpSinkOptions` (keep <= 100). |
| **`401 / 403 Forbidden`** | Missing or invalid `ANALYTICS_WRITE_TOKEN` | Verify authentication header in proxy or `HttpSinkOptions`. |
| **`404 Not Found`** | Endpoint misconfigured (e.g. `/analytics/ingest` vs `/analytics/events`) | Check API routing in reverse proxy and client config. |
| **`502 / 503 / 504`** | Upstream ingest service or database down | Inspect core backend logs and container health. |
| **`CORS Error`** | Missing `Access-Control-Allow-Origin` on `OPTIONS` / `POST` | Check CORS layer in `packages/core/src/main.rs`. |

#### Step 3: Check Browser Connectivity & Offline Mode (#84)
If `client.isOffline` is true or `navigator.onLine === false`, the client pauses all `flush()` calls. While offline, the half-open probe is deferred until the window receives the `'online'` event.

### Remediation & Recovery

1. **Resolve Root Upstream Cause**: Fix backend crash, database contention, or CORS issues.
2. **Manual Reset for Local Debugging**:
   ```javascript
   client.getCircuitBreaker().reset();
   await client.flush();
   console.log('Circuit state after reset:', client.getCircuitBreaker().getState());
   ```
3. **Replay DLQ**: Once the circuit is closed, see [Replaying Dead-Letter Events](#replaying-dead-letter-events).
4. **Tune Breaker Thresholds** (if tripping prematurely under high traffic or transient latency):
   ```typescript
   new AnalyticsClient({
     // Increase threshold or adjust cooldown in options
   });
   ```

---

## 2. Growing Dead-Letter Queue

### Background (#91)

The `DeadLetterQueue` holds events whose delivery failed due to:
1. Sink network errors, rejected promises, or HTTP non-2xx responses.
2. The `CircuitBreaker` being `open` when `flush()` executes.
3. Synchronous exceptions thrown during transport execution.

The DLQ is capped at **100 events** (`maxSize: 100`). It uses a FIFO eviction strategy: when full, adding a new failed event evicts the oldest event with a console warning:
```text
[WARN] Dead-letter cap (100) reached — dropped oldest event: "<event_name>"
```

### Symptoms
- `client.getDeadLetter().size` is approaching or equal to `100`.
- Console warns of dropped oldest events.
- `metrics.deadLetterCount` or `metrics.eventsFailed` is elevated.

### Diagnostic Steps

#### Step 1: Inspect Failed Events
Drain or inspect the contents of the DLQ:
```javascript
const failedEvents = client.getDeadLetter().drain();
console.table(failedEvents.map(e => ({
  name: e.name,
  timestamp: new Date(e.timestamp).toISOString(),
  props: JSON.stringify(e.properties)
})));
```

#### Step 2: Categorize the Failure Pattern
- **All events failing with same error**: Ingest service outage, circuit breaker tripped, or incorrect endpoint URL.
- **Specific events failing**:
  - Event payload serialization failure (contains functions, `BigInt`, circular references).
  - Individual event size exceeds ingest limits.
  - Event timestamp skewed too far into future.

### Remediation & Recovery

#### Replaying Dead-Letter Events
Once the underlying connectivity or backend issue is resolved:
```javascript
async function replayDeadLetter(client) {
  const events = client.getDeadLetter().drain();
  console.log(`Replaying ${events.length} failed events...`);
  for (const event of events) {
    client.track(event.name, event.properties);
  }
  await client.flush();
  console.log('Replay complete. Current DLQ size:', client.getDeadLetter().size);
}
```

#### Preventing DLQ Overflow
- Ensure `flushIntervalMs` is set appropriately (default: `5000`ms).
- When operating in unreliable network conditions, events persist to `localStorage` on unload via `persistPendingQueue` (#85/#86), but dead-lettered events remain in memory. Drain and log to server or fallback storage if mission-critical audit trails are required.

---

## 3. Missing Events in Production

When expected events (e.g. `page_view`, `button_click`, `api_error`) do not reach the backend, trace through the pipeline using this 10-point checklist.

### Diagnostic Checklist

```text
Call track() ──> [1. Provider Disabled?] ──> [2. User Opted Out / DNT?]
                      │                            │
                      ▼ Yes: No-op                 ▼ Yes: Discarded
                 [3. Valid Properties?] ──> [4. Rate Limit / Sampling?]
                      │                            │
                      ▼ Invalid: Dropped           ▼ Exceeded: Dropped
                 [5. Deduplication?]   ──> [6. UTF-8 Size Cap?]
                      │                            │
                      ▼ Duplicate: Dropped         ▼ Oversized: Dropped
                 [7. In-Memory Queue]  ──> [8. Offline / Unload Persistence?]
                      │                            │
                      ▼ Queue Full: Evicted        ▼ Private Browsing: Not saved
                 [9. Circuit Breaker]  ──> [10. Ingest Endpoint Validation]
                      │                            │
                      ▼ Open: DLQ                  ▼ 4xx / 5xx: Rejected
```

#### 1. Provider Disabled Prop (#76)
- Check if `<AnalyticsProvider disabled>` was inadvertently set (e.g., test or Storybook flags leaking to production).
- When `disabled={true}`, all `track()` and `flush()` calls silently no-op.

#### 2. User Opt-Out / Do Not Track (#35, #925, #926)
- The pipeline respects user privacy settings:
  ```javascript
  import { optOutManager } from '@stellar-explain/analytics';
  console.log('Opted out?', optOutManager.isOptedOut());
  ```
- Checked sources:
  - `localStorage.getItem('stellar_analytics_opt_out') === 'true'`
  - `navigator.doNotTrack === '1'` or `window.doNotTrack === '1'`
- If active, events are discarded at the entrance of `track()`.

#### 3. Property Validation Failures (#30, #91)
- `validateProperties` rejects:
  - Functions / symbols
  - Circular object references
  - Unserializable values
- Any event containing invalid properties is discarded before reaching the queue.

#### 4. Rate Limiting (#93) & Sampling (#85, #1081)
- **Rate Limiting**: Token bucket allows up to `maxEventsPerSecond` (default: `100`). Bursts beyond capacity are dropped and logged:
  ```text
  [WARN] Rate limit exceeded (100 events/s) — dropped event: "<name>"
  ```
- **Sampling**: Probabilistic sampling configured via `sampleRate` (`0.0` to `1.0`). If `sampleRate = 0.5`, approximately 50% of events are dropped intentionally. Check `metrics.eventsDropped`.

#### 5. Short-Window Event Deduplication (#82, #1079)
- Events with identical names and property hashes within `dedupWindowMs` (default: `5000`ms) are suppressed.
- Verify if rapid duplicate calls are being coalesced.

#### 6. Payload Size Limits (#1080)
- Serialized UTF-8 event cap (default: `64KB` client limit; backend rejects bodies > `512KB`).
- Oversized events are truncated or dropped.

#### 7. In-Memory Queue & Flush Lifecycle (#1071)
- Check `client.getQueue().size`.
- In browser environments, events stay in the queue until `flush()` is triggered by the interval (`flushIntervalMs`) or explicit lifecycle triggers.
- If queue reaches `maxQueueSize` (default: `1000`), oldest events are evicted.

#### 8. Offline Mode & Storage Availability (#84, #35, #119)
- If the user goes offline (`isOffline === true`), flushing pauses.
- When navigating away, pending events are written to `localStorage` under `stellar_analytics_pending_queue`.
- **Private Browsing / Quota Exceeded Edge Case**: In Safari private browsing or when storage quota is exceeded, `localStorage.setItem` throws `QuotaExceededError` or `SecurityError`. The storage availability guard gracefully prevents persistence crashes, but events in memory during hard tab termination cannot be saved.

#### 9. Circuit Breaker / DLQ Interception
- Check whether events are ending up in `client.getDeadLetter()`.

#### 10. Backend Ingest Validation (#99, #101)
- The backend route `POST /analytics/events` enforces:
  - **Body limit**: 512 KB max request size.
  - **Batch limit**: Max 100 events per JSON array.
  - **Clock skew**: Event `timestamp` cannot be greater than `now + 3600` seconds (1 hour).
  - Verify server logs for:
    ```text
    "event rejected due to clock skew: timestamp=... now=..."
    "request body of ... bytes exceeds the 524288-byte limit"
    "batch of ... events exceeds the 100-event limit"
    ```

---

## Production Health Metrics Reference

Call `client.getMetrics()` to obtain current pipeline metrics:

| Metric Key | Description | Alert Condition |
|------------|-------------|-----------------|
| `eventsTracked` | Total events received by `track()` | Abrupt drop to 0 during peak hours |
| `eventsSent` | Total events successfully acknowledged by sinks | Flatlining while `eventsTracked` rises |
| `eventsFailed` | Total delivery attempts that failed | Sustained increase > 1% of total |
| `eventsDropped` | Events dropped by rate limiter, sampling, or queue eviction | Spike indicates severe throttling or spam |
| `circuitState` | `'closed'`, `'open'`, or `'half-open'` | Alert when state remains `'open'` > 2 minutes |
| `circuitOpenCount` | Number of times the circuit has tripped | Incrementing > 3 times in 1 hour |
| `queueSize` | Number of pending events in memory | Growing monotonically without draining |
| `deadLetterCount` | Number of events in dead-letter | Greater than 0 in healthy conditions |
