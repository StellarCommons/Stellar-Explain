# Stellar Explain — Development Guide

---

## Architecture

```
Browser → Next.js (localhost:3000) → Rust Backend → Stellar Horizon API
                                     (Render or local)
```

The browser never talks directly to the Rust backend. All API calls go through
Next.js proxy routes (`/api/*`) which forward them server-side.

---

## Quick Start — Use the Hosted Backend (Recommended)

The Rust backend is already deployed on Render. Frontend and CLI contributors
don't need Rust installed at all.

| Endpoint | URL |
|----------|-----|
| Health | `GET https://stellar-explain-core.onrender.com/health` |
| Transaction | `GET https://stellar-explain-core.onrender.com/tx/:hash` |
| Account | `GET https://stellar-explain-core.onrender.com/account/:address` |

### Step 1 — Clone and install

```bash
git clone https://github.com/StellarCommons/Stellar-Explain.git
cd Stellar-Explain
npm install       # from monorepo root
```

### Step 2 — Configure the frontend

Create `packages/ui/.env.local`:
```
# Points to the deployed Render backend — server-side only, never exposed to the browser
API_URL=https://stellar-explain-core.onrender.com
```

### Step 3 — Start the frontend

```bash
cd packages/ui
npm run dev
```

Open http://localhost:3000 — it proxies all API calls to the Render backend automatically.

### Step 4 — Verify

```bash
# Through the Next.js proxy
curl http://localhost:3000/api/health

# Direct backend smoke-test
curl https://stellar-explain-core.onrender.com/tx/b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020
```

---

## Local Rust Backend (Backend Contributors)

Only needed if you're working on `packages/core`.

### Prerequisites

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Rust | 1.88+ | https://rustup.rs |
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | Comes with Node.js |

```bash
rustc --version   # should be 1.88+
rustup update     # upgrade if needed
```

### Step 1 — Create the backend env file

Create `packages/core/.env`:
```
STELLAR_NETWORK=testnet
HORIZON_URL=https://horizon-testnet.stellar.org
CORS_ORIGIN=http://localhost:3000
```

### Step 2 — Start the backend

```bash
cd packages/core
cargo run
```

First compile takes ~60 seconds; subsequent runs are fast. You'll see:
```
Allowing CORS from: http://localhost:3000
Using Horizon URL: https://horizon-testnet.stellar.org
Stellar Explain backend running on 0.0.0.0:4000
```

### Step 3 — Verify the backend

```bash
curl http://localhost:4000/health
curl http://localhost:4000/tx/b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020
```

### Step 4 — Point the frontend at local backend

Update `packages/ui/.env.local`:
```
API_URL=http://localhost:4000
```

Then start the frontend (`npm run dev` in `packages/ui`) and verify the proxy:
```bash
curl http://localhost:3000/api/health
```

---

## CLI

```bash
cd packages/cli
npm install
npm run build

# Point at Render backend
./bin/stellar-explain tx b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020

# Or point at local backend
./bin/stellar-explain --url http://localhost:4000 tx <hash>
```

---

## Project Structure

```
packages/
├── core/                          # Rust backend
│   ├── src/
│   │   ├── main.rs                # Entry point, CORS, router setup
│   │   ├── routes/                # HTTP route handlers
│   │   ├── services/              # Horizon API client
│   │   ├── models/                # Domain types
│   │   ├── explain/               # Explanation logic
│   │   ├── config/                # Network configuration
│   │   └── errors.rs              # Structured error types
│   ├── Cargo.toml
│   ├── Dockerfile                 # Multi-stage: rust:1.88-alpine → alpine:3.22
│   └── .env                       # Local env (not committed)
│
├── ui/                            # Next.js 15 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/               # Proxy routes → Rust backend (server-side)
│   │   │   │   ├── tx/[hash]/
│   │   │   │   ├── account/[address]/
│   │   │   │   └── health/
│   │   │   ├── tx/[hash]/         # Transaction explanation page
│   │   │   └── page.tsx           # Landing page
│   │   └── lib/
│   │       └── api.ts             # Typed API client
│   ├── package.json
│   └── .env.local                 # API_URL (not committed)
│
└── cli/                           # Node.js CLI
    ├── src/
    │   ├── commands/              # tx, account, health
    │   └── lib/                   # client, config, errors, validate
    └── tests/
```

---

## Deployment

The backend is deployed via **Render Blueprint** (`render.yaml` at repo root).

- Runtime: Docker (`packages/core/Dockerfile`)
- Rust version: 1.88 (required for let-chains)
- Keep-alive: GitHub Actions cron every 5 min (`.github/workflows/keep-alive.yml`)
- Health check: `GET /health`

---

## Troubleshooting

**Frontend showing 502 / connection refused**
- If using Render backend: check https://stellar-explain-core.onrender.com/health — it may be cold-starting (takes ~30s)
- If using local backend: make sure `cargo run` is running in `packages/core`

**CORS errors in browser console**
- Make sure `CORS_ORIGIN` in `packages/core/.env` matches the frontend URL exactly
- Restart the Rust backend after changing `.env`

**`cargo run` fails to compile**
- Rust 1.88+ is required: `rustc --version`
- Upgrade with: `rustup update`

**`npm run dev` fails**
- Node.js 18+ required: `node --version`
- Reinstall: `rm -rf node_modules && npm install`

---

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feat/your-feature-name`
3. Make your changes and test locally using this guide
4. Open a pull request from your fork into `StellarCommons/Stellar-Explain`

For available issues, see the project's issue tracker.
