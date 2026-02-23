# Stellar Explain – Core API

The `core` package contains the Rust backend API for Stellar Explain.

It exposes HTTP endpoints that fetch data from Horizon and return structured explanations of Stellar transactions.

---

## 🚀 Getting Started

### Prerequisites

- Rust (latest stable recommended)  
  Install via: https://rustup.rs
- Cargo (installed with Rust)
- Access to a Horizon instance (defaults to public/testnet)
- Optional: Docker (if running via container)

Check your Rust version:

```bash
rustc --version
```

---

## ⚙️ Environment Variables

The API reads configuration from environment variables:

| Variable          | Description                 | Default                 |
| ----------------- | --------------------------- | ----------------------- |
| `STELLAR_NETWORK` | `public` or `testnet`       | `public`                |
| `HORIZON_URL`     | Custom Horizon URL override | Network default         |
| `CORS_ORIGIN`     | Allowed CORS origin         | `http://localhost:3000` |
| `RUST_LOG`        | Logging level               | `info`                  |

Example:

```bash
export STELLAR_NETWORK=testnet
export RUST_LOG=info
```

---

## 🛠 Build & Run

From the repository root:

```bash
cargo build --release -p core
```

Run locally:

```bash
cargo run -p core
```

The server starts on:

```
http://localhost:4000
```

---

## 🧪 Running Tests

Run all tests:

```bash
cargo test -p core
```

Run with logs:

```bash
RUST_LOG=debug cargo test -p core
```

---

## 🐳 Running with Docker

From the project root:

```bash
docker-compose up --build
```

The API will be available at:

```
http://localhost:4000
```

Health check:

```bash
curl http://localhost:4000/health
```

---

## 📡 API Endpoints

---

### GET `/health`

Returns service status and Horizon connectivity.

#### Example

```bash
curl http://localhost:4000/health
```

#### Response

```json
{
  "status": "ok",
  "network": "testnet",
  "horizon_reachable": true,
  "version": "0.1.0"
}
```

If Horizon is unreachable:

- HTTP 503
- `"status": "degraded"`

---

### GET `/tx/:hash`

Returns a structured explanation of a Stellar transaction.

#### Example

```bash
curl http://localhost:4000/tx/3b7e9b6f...
```

#### Example Response

```json
{
  "hash": "3b7e9b6f...",
  "successful": true,
  "fee_charged": 100,
  "memo": "Payment for services",
  "operations": [
    {
      "type": "payment",
      "from": "GABC...",
      "to": "GXYZ...",
      "asset": "XLM",
      "amount": "100.0000000"
    }
  ],
  "explanation": "This transaction transferred 100 XLM from GABC... to GXYZ..."
}
```

---

### GET `/account/:address` (Planned)

Will return paginated transactions for an account.

#### Example

```bash
curl http://localhost:4000/account/GABC...
```

#### Expected Response Structure

```json
{
  "account": "GABC...",
  "transactions": [],
  "next_cursor": "...",
  "prev_cursor": "..."
}
```

---

## 🔐 Rate Limiting

The API applies global per-IP rate limiting:

- 60 requests per minute
- Returns HTTP 429 if exceeded
- Includes `Retry-After` header

---

## 🏗 Project Structure

```
packages/core
├── src/
│   ├── routes/
│   ├── services/
│   ├── models/
│   ├── config/
│   └── main.rs
├── Cargo.toml
└── README.md
```

---

## 🤝 Contributing

We welcome contributions.

### How to Contribute

1. Check open issues
2. Create a new branch from `main`
3. Follow conventional commit format
4. Ensure:
   - Code compiles
   - Tests pass
   - Formatting is clean (`cargo fmt`)
   - Linting passes (`cargo clippy`)
5. Open a Pull Request referencing the issue number

Example:

```
feat(health): add horizon connectivity check
```

### Running Checks Before PR

```bash
cargo fmt
cargo clippy
cargo test
```

---

## 📜 License

MIT (or project-specific license)
