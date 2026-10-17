# Stellar Explain – Core (Backend)

This package contains the **Rust/Axum backend** for Stellar Explain.

The backend:
- Fetches data from Stellar Horizon
- Converts raw blockchain data into internal domain models
- Produces clear, human-readable explanations as structured JSON

---

## 🧠 Architectural Principles

- Routes are thin
- Business logic lives in services
- Explanation logic is pure and deterministic
- Horizon JSON is never exposed directly
- Internal models are Horizon-agnostic

---

## 🗂️ Module Layout

```
src/
├── main.rs          # Entry point and router setup
├── routes/          # HTTP layer (thin)
├── services/        # Orchestration & IO (Horizon client)
├── explain/         # Core explanation logic
├── models/          # Internal domain models
├── middleware/      # Request ID middleware
├── analytics/       # Event ingestion and persistence
└── errors.rs        # Unified error handling
```

---

## ▶️ Running the Backend

```bash
cargo run
```

By default the server runs on port **4000**.

### Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` / `BIND_ADDR` | Port and bind address |
| `STELLAR_NETWORK` | Stellar network to use |
| `HORIZON_URL` | Horizon base URL |
| `CORS_ORIGIN` | Allowed CORS origin |
| `LOG_FORMAT` | Set to `json` for JSON logs |
| `ANALYTICS_LOG_PATH` | File where analytics events are persisted (NDJSON) |
| `ANALYTICS_READ_TOKEN` | Bearer token for analytics read endpoints |

### Endpoints

- `GET /health` – returns JSON: `status`, `network`, `horizon_reachable`, `version`
- `GET /tx/:hash` – human-readable explanation of a transaction
- `GET /account/:address` – account explanation
- `GET /account/:address/history` – account transactions (`limit` 1-50, `cursor`, `order`)
- `POST /analytics/events` – ingest an analytics event
- `GET /analytics/summary` – analytics summary
- `GET /docs` – Swagger UI (OpenAPI spec at `/openapi.json`)

```bash
curl http://localhost:4000/health
curl http://localhost:4000/tx/<transaction-hash>
```

Validation errors return stable codes, e.g. `INVALID_TRANSACTION_HASH`, `INVALID_LIMIT`, `INVALID_ADDRESS_LENGTH`.

---

## 🔍 Structured Logging and Request Tracing

The backend emits structured logs for each request. Set `LOG_FORMAT=json` to emit JSON logs:

```bash
LOG_FORMAT=json cargo run
```

### Log fields

- `request_id`: UUID generated per request, also returned as the `x-request-id` response header
- `hash`: transaction hash for `/tx/{hash}` requests
- `address`: account address for `/account/{address}` requests
- `horizon_fetch_duration_ms`: time spent waiting on Horizon calls
- `explain_duration_ms`: time spent generating explanation output
- `total_duration_ms`: total handler response time
- `status`: HTTP status code emitted by the handler
- `upstream_error`: upstream failure marker when Horizon is unreachable or fails
- `fee_stats_available`: whether Horizon `fee_stats` was available for the request

---

## 🧪 Testing

```bash
cargo test
```

## 🤝 Contributing

Keep changes focused and follow the existing module boundaries. Join the maintainer Telegram group: https://t.me/+n10W2fqjxBhmNDM0
