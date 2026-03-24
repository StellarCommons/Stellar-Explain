# Stellar Explain — Frontend

The Next.js frontend for [Stellar Explain](https://github.com/StellarCommons/Stellar-Explain) — a tool that explains Stellar blockchain transactions and accounts in plain English.

---

## Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- A running instance of the [Stellar Explain backend](../core/README.md) (Rust)

Check your versions:
```bash
node --version
npm --version
```

---

## Setup

```bash
# 1. Clone the repo (if you haven't already)
git clone https://github.com/StellarCommons/Stellar-Explain.git
cd Stellar-Explain/packages/ui

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.local.example .env.local
# Edit .env.local and set API_URL to your running backend

# 4. Start the dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `API_URL` | ✅ Yes | URL of the Stellar Explain Rust backend | `http://localhost:4000` |
| `NEXT_PUBLIC_STELLAR_NETWORK` | No | Network label shown in the UI | `testnet` |

> **Note:** `API_URL` is read server-side only and is never exposed to the browser. All requests to the backend are proxied through Next.js API routes.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint + TypeScript type check |
| `npm run format` | Format all source files with Prettier |
| `npm run format:check` | Check formatting without writing changes |

---

## Project Structure

```
packages/ui/
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── page.tsx                # Landing page (/)
│   │   ├── app/page.tsx            # Search page (/app)
│   │   ├── tx/[hash]/page.tsx      # Transaction result (/tx/:hash)
│   │   ├── account/[address]/      # Account result (/account/:address)
│   │   └── api/                    # Next.js proxy routes (server-side only)
│   │       ├── tx/[hash]/route.ts
│   │       ├── account/[address]/route.ts
│   │       └── health/route.ts
│   │
│   ├── components/                 # Shared UI components
│   │   ├── AppShell.tsx            # Shared page wrapper with header and context
│   │   ├── AppShellContext.ts      # React context + useAppShell() hook
│   │   ├── TransactionResult.tsx   # Transaction explanation display
│   │   ├── AccountResult.tsx       # Account explanation display
│   │   ├── ErrorDisplay.tsx        # Typed API error display
│   │   ├── Toast.tsx               # Copy-to-clipboard notification
│   │   ├── Card.tsx                # Base card wrapper
│   │   ├── Pill.tsx                # Status pill (success/fail/warning)
│   │   ├── Label.tsx               # Section label
│   │   ├── AddressChip.tsx         # Truncated address with copy
│   │   ├── TabSwitcher.tsx         # Transaction / Account tab toggle
│   │   ├── SearchBar.tsx           # Search input + submit
│   │   ├── landing/                # Landing page sections
│   │   ├── history/                # Search history panel (UI #21)
│   │   └── addressbook/            # Address book panel (UI #22)
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── useSearchHistory.ts     # localStorage search history
│   │   ├── useAddressBook.ts       # localStorage address book
│   │   ├── useCopyToClipboard.ts   # Clipboard with reset state
│   │   └── usePersonalMode.ts      # Personalised explanation mode
│   │
│   ├── lib/                        # Utilities and API client
│   │   ├── api.ts                  # Typed fetch functions
│   │   ├── errors.ts               # Error type guards and helpers
│   │   └── utils.ts                # Formatting helpers
│   │
│   └── types/
│       └── index.ts                # TypeScript types mirroring backend shapes
│
├── .env.local.example              # Environment variable template
├── next.config.ts                  # Next.js configuration (standalone output)
├── tailwind.config.ts              # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript configuration (strict mode)
├── .prettierrc                     # Prettier formatting rules
├── eslint.config.mjs               # ESLint configuration
└── Dockerfile                      # Multi-stage Docker build
```

---

## Connecting to the Backend

### Option A — Run the Rust backend locally

```bash
# From the monorepo root
cargo run -p core
# Backend starts at http://localhost:4000
```

Then set in your `.env.local`:
```
API_URL=http://localhost:4000
```

### Option B — Docker Compose (recommended)

Runs both frontend and backend together:

```bash
# From the monorepo root
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

The frontend container connects to the backend via Docker's internal network using `http://backend:4000` — this is configured automatically in `docker-compose.yml`.

---

## Architecture

### Proxy Pattern

The frontend never calls the Stellar Explain backend directly from the browser. All API calls go through Next.js server-side proxy routes:

```
Browser → /api/tx/[hash] (Next.js server) → http://localhost:4000/tx/:hash (Rust backend)
```

This means `API_URL` is only ever read on the server — it is never bundled into the client JavaScript or exposed in network requests. This is intentional.

### AppShell + Context

All app pages (`/app`, `/tx/:hash`, `/account/:address`) are wrapped in `AppShell`, which provides shared state via React context. Child pages access shared state via `useAppShell()`:

```tsx
function TxPageInner() {
  const { addEntry } = useAppShell();
  ...
}

export default function TxPage() {
  return (
    <AppShell>
      <TxPageInner />
    </AppShell>
  );
}
```

### Route Structure

| URL | Description |
|-----|-------------|
| `/` | Landing page |
| `/app` | Search page — enter a hash or address |
| `/tx/:hash` | Transaction explanation result |
| `/account/:address` | Account explanation result |

---

## Contributing

See the root [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

Before opening a PR, make sure:
```bash
npm run lint          # No TypeScript or ESLint errors
npm run format:check  # Code is formatted correctly
```