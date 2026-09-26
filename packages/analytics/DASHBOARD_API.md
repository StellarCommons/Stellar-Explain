# Analytics Ingest & Dashboard API Specification

This document details the HTTP request/response contract for the Stellar Explain analytics ingest endpoint (#101) and associated summary endpoints. It is intended for frontend developers, backend engineers, and data engineers building dashboards or custom clients against the analytics pipeline.

---

## 1. Overview

The Stellar Explain analytics system collects anonymous client events and surfaces aggregate metrics for dashboards and monitoring.

- **Ingest Route**: `POST /analytics/events` (axum core service)
- **UI Proxy Route**: `POST /api/analytics/ingest` (Next.js frontend proxy)
- **Read / Summary Route**: `GET /analytics/summary`
- **Default Port**: `4000` (core server)

---

## 2. Ingest Endpoint Contract (`POST /analytics/events`)

The ingest endpoint receives individual events or batches of events from the browser or external clients, validates them, and stores them in the event buffer.

### HTTP Request

- **Method**: `POST`
- **Path**: `/analytics/events`
- **Headers**:
  | Header | Required | Value | Notes |
  |--------|----------|-------|-------|
  | `Content-Type` | **Yes** | `application/json` | Payloads must be valid JSON |
  | `Accept` | Optional | `application/json` | Response is JSON |
  | `Content-Encoding` | Optional | `gzip` | Supported by `HttpSink` via `CompressionStream` |
  | `Authorization` | Optional | `Bearer <ANALYTICS_WRITE_TOKEN>` | Required when write auth is enabled |

---

### Request Body Formats

The ingest endpoint accepts either a **single event JSON object** or a **batch of events (JSON array)**.

#### Format A: Batch Payload (Preferred by `HttpSink`)

```json
[
  {
    "name": "page_view",
    "timestamp": 1758877200000,
    "properties": {
      "url": "/tx/0x1a2b3c",
      "title": "Transaction Details",
      "referrer": "https://stellar.org"
    },
    "context": {
      "environment": "production",
      "buildVersion": "1.0.0",
      "device": "desktop",
      "os": "macOS",
      "browser": "Chrome",
      "locale": "en-US",
      "timeZone": "UTC"
    }
  },
  {
    "name": "button_click",
    "timestamp": 1758877202500,
    "properties": {
      "id": "copy-tx-hash",
      "section": "summary-card"
    },
    "context": {
      "environment": "production"
    }
  }
]
```

#### Format B: Single Event Payload

```json
{
  "name": "search_performed",
  "timestamp": 1758877210000,
  "properties": {
    "queryLength": 56,
    "filterType": "account"
  },
  "context": {
    "environment": "production"
  }
}
```

---

### Event Field Specifications

| Field | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `name` | `string` | **Yes** | The canonical event identifier (e.g. `page_view`, `button_click`, `api_error`) | Must be non-empty string |
| `timestamp` | `number` | **Yes** | Unix timestamp in milliseconds (or seconds) | Cannot be > 1 hour in the future |
| `properties` | `object` | No | Arbitrary JSON key-value pairs specific to the event | Plain JSON object. PII is scrubbed before transmission. |
| `context` | `object` | No | Environment, system, device, and version metadata | Plain JSON object. |

---

### Ingest Validation & Abuse Protection Rules

The ingest endpoint enforces three strict validation rules before accepting events:

1. **Maximum Request Size**:
   - **Limit**: **512 KB** (`524,288` bytes).
   - Enforced on the raw body *before* parsing JSON to protect against memory allocation attacks.
   - If exceeded, the server immediately returns **`413 Payload Too Large`**.

2. **Maximum Batch Size**:
   - **Limit**: **100 events** per request.
   - If a JSON array contains more than 100 items, the server returns **`413 Payload Too Large`**.

3. **Clock Skew Protection**:
   - **Limit**: Timestamps cannot be more than **1 hour (3600 seconds)** in the future relative to the ingest server clock.
   - If exceeded, the server returns **`400 Bad Request`**.

---

### Ingest Responses

#### `200 OK` / `202 Accepted` — Successful Ingestion
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "accepted"
}
```

#### `400 Bad Request` — Validation Failure (Clock Skew or Malformed JSON)
```http
HTTP/1.1 400 Bad Request
Content-Type: text/plain; charset=utf-8

event timestamp is more than 1 hour in the future
```
or
```http
HTTP/1.1 400 Bad Request
Content-Type: text/plain; charset=utf-8

invalid JSON body: expected value at line 1 column 1
```

#### `413 Payload Too Large` — Size or Batch Count Exceeded
```http
HTTP/1.1 413 Payload Too Large
Content-Type: text/plain; charset=utf-8

request body of 614400 bytes exceeds the 524288-byte limit
```
or
```http
HTTP/1.1 413 Payload Too Large
Content-Type: text/plain; charset=utf-8

batch of 150 events exceeds the 100-event limit
```

#### `401 Unauthorized` / `403 Forbidden` — Auth Failure
Returned when `ANALYTICS_WRITE_TOKEN` is configured on the backend and the incoming request lacks the matching `Authorization: Bearer <token>` header.

---

## 3. Dashboard Read Endpoint (`GET /analytics/summary`)

For building dashboards and analytics visualizations, the server provides an aggregated summary endpoint.

### HTTP Request

- **Method**: `GET`
- **Path**: `/analytics/summary`
- **Query Parameters**:
  | Parameter | Type | Required | Default | Description |
  |---|---|---|---|---|
  | `from` | `string` | No | 24 hours ago | Start of window as ISO-8601 UTC string (e.g. `2026-09-25T00:00:00Z`) |
  | `to` | `string` | No | Current time | End of window as ISO-8601 UTC string (e.g. `2026-09-26T00:00:00Z`) |
- **Headers**:
  | Header | Required | Value |
  |---|---|---|
  | `Authorization` | Optional | `Bearer <ANALYTICS_READ_TOKEN>` |

### Response (`200 OK`)

Event counts are sorted alphabetically by event name to ensure deterministic responses.

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "from": "2026-09-25T00:00:00Z",
  "to": "2026-09-26T00:00:00Z",
  "events": [
    {
      "event": "api_call",
      "count": 142
    },
    {
      "event": "button_click",
      "count": 89
    },
    {
      "event": "page_view",
      "count": 520
    },
    {
      "event": "search_performed",
      "count": 64
    }
  ],
  "total": 815
}
```

---

## 4. Privacy & PII Sanitization Guarantee (#88, #89)

Before events are transmitted to the ingest endpoint, `@stellar-explain/analytics` scrubs sensitive data:

1. **Email Addresses**: Any pattern resembling an email address is scrubbed to `[email]`.
2. **Account / Card / Phone Numbers**: Any sequence of 12 or more consecutive digits is scrubbed to `[long-number]`.
3. **Opt-Out & Do Not Track**: If `optOutManager.isOptedOut()` is true or the user's browser sends `DNT: 1`, no events are emitted or ingested.

Dashboard consumers can safely store and display aggregate data without risk of exposing personally identifiable information.

---

## 5. Client Integration Examples

### cURL: Sending a Batch to Ingest
```bash
curl -X POST "http://localhost:4000/analytics/events" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "name": "page_view",
      "timestamp": '$(date +%s%3N)',
      "properties": { "url": "/tx/0xabc" }
    }
  ]'
```

### cURL: Querying Summary for a Dashboard
```bash
curl "http://localhost:4000/analytics/summary?from=2026-09-25T00:00:00Z&to=2026-09-26T00:00:00Z"
```

### TypeScript / Fetch Dashboard Widget Example
```typescript
interface AnalyticsSummary {
  from: string;
  to: string;
  events: Array<{ event: string; count: number }>;
  total: number;
}

export async function fetchAnalyticsSummary(
  apiUrl: string = 'http://localhost:4000',
  fromIso?: string,
  toIso?: string,
  token?: string,
): Promise<AnalyticsSummary> {
  const url = new URL('/analytics/summary', apiUrl);
  if (fromIso) url.searchParams.set('from', fromIso);
  if (toIso) url.searchParams.set('to', toIso);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    throw new Error(`Analytics API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
```
