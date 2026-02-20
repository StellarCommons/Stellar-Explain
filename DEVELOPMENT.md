# Stellar Explain — Local Development Guide

This guide walks you through running the full Stellar Explain stack locally:
the Rust backend and the Next.js frontend, connected and working together.

---

## Architecture

```
Browser → Next.js (localhost:3000) → Rust Backend (localhost:4000) → Stellar Horizon API
```

The browser never talks directly to the Rust backend. All API calls go through
Next.js proxy routes (`/api/*`) which forward them to the backend server-side.

---

## Prerequisites

Before you start, make sure you have the following installed:

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Rust | 1.75+ | https://rustup.rs |
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | Comes with Node.js |
| Git | Any | https://git-scm.com |

Verify your versions:
```bash
rustc --version
node --version
npm --version
```

---

## Running the Rust Backend

### Step 1 — Navigate to the core package
```bash
cd packages/core
```

### Step 2 — Create your environment file

Copy the example env file:
```bash
cp .env.example .env
```

Or create `.env` manually with these contents:
```
STELLAR_NETWORK=testnet
HORIZON_URL=https://horizon-testnet.stellar.org
CORS_ORIGIN=http://localhost:3000
```

| Variable | Description |
|----------|-------------|
| `STELLAR_NETWORK` | Which network to use — `testnet` or `public` |
| `HORIZON_URL` | The Horizon API endpoint for the chosen network |
| `CORS_ORIGIN` | The frontend URL allowed to make requests to the backend |

### Step 3 — Start the backend
```bash
cargo run
```

The first run will compile all dependencies — this takes about 60 seconds.
Subsequent runs are much faster.

You should see:
```
Allowing CORS from: http://localhost:3000
Using Horizon URL: https://horizon-testnet.stellar.org
Stellar Explain backend running on 0.0.0.0:4000
```

### Step 4 — Verify the backend is running

Open a new terminal and run:
```bash
curl http://localhost:4000/health
```
Expected response: `ok`

### Step 5 — Test a real transaction

Use this known testnet transaction hash to confirm the full pipeline works:
```bash
curl http://localhost:4000/tx/b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020
```

Expected: a JSON response with `transaction_hash`, `successful`, `summary`,
and `payment_explanations`. If you see this, your backend is fully working.

---

## Running the Next.js Frontend

> Make sure the Rust backend is already running before starting this step.

### Step 1 — Navigate to the ui package
```bash
cd packages/ui
```

### Step 2 — Install dependencies
```bash
npm install
```

### Step 3 — Create your environment file

Create `.env.local` in `packages/ui/` with these contents:
```
# URL of the Rust backend — server-side only, never exposed to the browser
API_URL=http://localhost:4000
```

> Note: This variable is `API_URL` not `NEXT_PUBLIC_API_URL` — it is intentionally
> server-side only. The browser never sees the backend URL directly.

### Step 4 — Start the frontend
```bash
npm run dev
```

You should see:
```
▲ Next.js 15.x.x
- Local: http://localhost:3000
```

### Step 5 — Verify the proxy is working

Test that the Next.js proxy routes are forwarding requests to the backend:

```bash
# Health check through the proxy
curl http://localhost:3000/api/health

# Transaction explanation through the proxy
curl http://localhost:3000/api/tx/b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020
```

Both should return the same responses as the direct backend calls.
If they do, the full stack is connected. ✅

---

## Running Both at Once (docker-compose)

If you have Docker installed, you can run the entire stack with one command
from the monorepo root:

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

See `docker-compose.yml` for configuration details.

> docker-compose support is tracked in INT #4.
> If that issue hasn't been merged yet, use the manual steps above.

---

## Verifying Your Full Setup

Once both services are running, open your browser and navigate to:
```
http://localhost:3000
```

Paste this testnet transaction hash into the search bar:
```
b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020
```

You should see a human-readable explanation of the transaction.

To confirm the browser is using the proxy correctly, open DevTools → Network tab
and verify all requests show `localhost:3000` — not `localhost:4000`.

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
│   └── .env                       # Local env (not committed)
│
└── ui/                            # Next.js frontend
    ├── src/
    │   ├── app/
    │   │   ├── api/               # Proxy routes to Rust backend
    │   │   │   ├── tx/[hash]/     # GET /api/tx/:hash
    │   │   │   ├── account/[address]/ # GET /api/account/:address
    │   │   │   └── health/        # GET /api/health
    │   │   ├── tx/[hash]/         # Transaction explanation page
    │   │   └── page.tsx           # Homepage
    │   └── lib/
    │       └── api.ts             # Typed API client
    ├── package.json
    └── .env.local                 # Local env (not committed)
```

---

## Troubleshooting

**CORS errors in the browser console**
- Make sure `CORS_ORIGIN=http://localhost:3000` is set in `packages/core/.env`
- Restart the Rust backend after changing `.env`
- Confirm the backend is running: `curl http://localhost:4000/health`

**Frontend showing 502 Bad Gateway**
- The Rust backend is not running
- Start it with `cargo run` in `packages/core`

**`cargo run` fails to compile**
- Make sure your Rust version is 1.75+: `rustc --version`
- Run `rustup update` to get the latest stable version

**`npm run dev` fails**
- Make sure Node.js is 18+: `node --version`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

**Transaction returns empty or unexpected data**
- You may be on the wrong network — check `STELLAR_NETWORK` in your `.env`
- The testnet hash above only works on testnet

---

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feat/your-feature-name`
3. Make your changes and test locally using this guide
4. Open a pull request from your fork into `StellarCommons/Stellar-Explain`

For available issues to work on, see the project's issue tracker.