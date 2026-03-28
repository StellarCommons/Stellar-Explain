```md
# Stellar Explain – Core (Backend)

This package contains the **Rust backend** for Stellar Explain.

The backend is responsible for:
- Fetching data from Stellar Horizon
- Converting raw blockchain data into internal domain models
- Producing clear, human-readable explanations

---

## 🎯 Scope (v1)

Backend v1 focuses on **one thing only**:

> **Explaining Stellar payment transactions**

Specifically:
- Fetch a transaction by hash
- Identify payment operations
- Produce plain-English explanations
- Return structured JSON responses

Out of scope for v1:
- Account summaries
- Non-payment operations
- Frontend concerns
- Smart contracts

---

## 🧠 Architectural Principles

- Routes are thin
- Business logic lives in services
- Explanation logic is pure and deterministic
- Horizon JSON is never exposed directly
- Internal models are Horizon-agnostic

---

## 🗂️ Module Layout (Target)

```

src/
├── main.rs          # Application entry point
├── app.rs           # Router & middleware setup
├── config.rs        # Environment & config
├── state.rs         # Shared app state
│
├── routes/          # HTTP layer (thin)
│   └── tx.rs
│
├── services/        # Orchestration & IO
│   ├── horizon.rs
│   └── explain.rs
│
├── explain/         # Core explanation logic
│   ├── transaction.rs
│   └── operation/
│       └── payment.rs
│
├── models/          # Internal domain models
│   ├── transaction.rs
│   └── operation.rs
│
└── errors.rs        # Unified error handling

````

---

## ▶️ Running the Backend

```bash
cargo run
````

By default, the server runs on port **4000**.

### Health check

```bash
curl http://localhost:4000/health
```

Expected response:

```
ok
```

### GET /tx/:hash

Returns a human-readable explanation of a Stellar transaction.

```bash
curl http://localhost:4000/tx/<transaction-hash>
```

### GET /tx/:hash/raw

Returns the raw, unprocessed JSON response from Horizon for the given transaction hash. Useful for developers and power users who want direct access to the full Horizon data.

```bash
curl http://localhost:4000/tx/<transaction-hash>/raw
```

Applies the same error handling as `/tx/:hash` — 400 for invalid hashes, 404 for not found, 502 for upstream failures.

---

## 🧪 Testing

All backend contributions **must include tests**.

Run tests with:

```bash
cargo test
```

---

## 🤝 Contributing to Core

* Pick an issue from the current backend milestone
* Keep changes focused and incremental
* Avoid introducing unused abstractions
* Follow the existing module boundaries

### 💬 Need Help?

Join the maintainer Telegram group:
👉 **[https://t.me/+n10W2fqjxBhmNDM0](https://t.me/+n10W2fqjxBhmNDM0)**

---

## 🚦 Status

🚧 Early development, intentionally minimal.

The backend will grow **one operation type at a time**.

```

---

## ✅ What This Achieves

- Clear **vision** without overpromising
- Strong alignment with the **Drips issue philosophy**
- Reduced contributor friction
- Easy onboarding for both FE & BE contributors
- A roadmap that scales without rewrites

---
```

## 🔍 Structured Logging and Request Tracing

The backend emits structured logs for each request. Logs include request-scoped tracing fields and timing metrics for Horizon fetches and explanation work.

Set `LOG_FORMAT=json` to emit JSON logs:

```bash
LOG_FORMAT=json cargo run
```

### Log fields

- `request_id`: UUID generated per request by middleware and also returned as `x-request-id` response header
- `hash`: transaction hash for `/tx/{hash}` requests
- `address`: account address for `/account/{address}` requests
- `horizon_fetch_duration_ms`: time spent waiting on Horizon calls
- `explain_duration_ms`: time spent generating explanation output (transaction explain route)
- `total_duration_ms`: total handler response time
- `status`: HTTP status code emitted by the handler
- `upstream_error`: upstream failure marker when Horizon is unreachable or fails
- `fee_stats_available`: whether Horizon `fee_stats` was available for the transaction explanation request
