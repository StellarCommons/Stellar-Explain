# @stellar-explain/analytics

Internal analytics pipeline for Stellar Explain — tracks anonymous usage events
and surfaces them via a dashboard API.

## Quick Start

```typescript
import { EventEmitter, HttpSink } from "@stellar-explain/analytics";

const emitter = new EventEmitter();
const sink = new HttpSink({ url: "https://api.example.com/events" });

emitter.on("page_view", (event) => sink.send(event));
emitter.track({
  id: "evt-001",
  name: "page_view",
  timestamp: new Date(),
  properties: { path: "/home" },
  sessionId: "sess-abc",
});
```

## Event Types

| Event Name | Description |
|------------|-------------|
| `page_view` | A page was viewed |
| `button_click` | A button was clicked |
| `form_submit` | A form was submitted |
| `api_call` | An API request was made |
| `error_occurred` | An error was encountered |
| `login` | User logged in |
| `logout` | User logged out |
| `search` | A search was performed |
| `purchase` | A purchase was completed |
| `refund` | A refund was processed |

## Sink Options

| Sink | Description |
|------|-------------|
| `ConsoleSink` | Logs events to the console |
| `HttpSink` | Sends events as JSON POST requests |

## Config Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `limitPayload.maxBytes` | number | 1024 | Max bytes per string property value |
| `HttpSink.url` | string | (required) | Endpoint URL for POST requests |
| `HttpSink.headers` | object | `{}` | Custom HTTP headers |

## Privacy

- **No PII:** We do not collect personal data.
- **DNT respected:** Tracking is disabled when `DNT` header is set.
- **Session IDs** are ephemeral and regenerated per page load.
- **Data is not sold or shared.**

## Dashboard API

Refer to [DASHBOARD_API.md](./DASHBOARD_API.md) for the read-side REST API
documentation.

### Example: Get summary

```bash
curl "https://stellar-explain-core.onrender.com/analytics/summary"
```

### Example: Get timeseries

```bash
curl "https://stellar-explain-core.onrender.com/analytics/timeseries?bucket=hour"
```

### Example: Get top hashes

```bash
curl "https://stellar-explain-core.onrender.com/analytics/top-hashes?limit=10"
```

### Example: Get error breakdown

```bash
curl "https://stellar-explain-core.onrender.com/analytics/errors"
```

### Example: Get session count

```bash
curl "https://stellar-explain-core.onrender.com/analytics/sessions"
```
