# Analytics Dashboard API

Read-side REST API for the analytics dashboard, served by the Rust backend
under `packages/core/src/routes/analytics.rs`.

## `GET /analytics/summary`

Total event counts by event name over a time range.

- Query params: `from`, `to` (ISO 8601 datetimes, optional)
- Response: `{ "counts": { "page_view": 120, "login": 8 } }`

## `GET /analytics/timeseries`

Event counts bucketed by hour or day.

- Query params: `event` (optional name filter), `bucket` (`hour` | `day`,
  default `hour`), `from`, `to`
- Response: `{ "buckets": [{ "start": "2024-01-15T10:00:00Z", "count": 42 }] }`

## `GET /analytics/top-hashes`

Most frequently explained transaction hashes over a time window.

- Query params: `limit` (default 10, max 50), `from`, `to`
- Response: `{ "hashes": [["abc123", 12]] }`

## `GET /analytics/errors`

Error event breakdown by `properties.statusCode` or `properties.type`.

- Response: `{ "breakdown": { "500": 3, "400": 1 } }`

## `GET /analytics/sessions`

Count of unique session IDs seen in a time window.

- Response: `{ "unique_sessions": 214 }`

All endpoints are read-only and return JSON. Write access goes through
`POST /analytics/ingest` only.
