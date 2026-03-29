# @stellar-explain/sdk

TypeScript SDK for the [Stellar Explain](../../README.md) API — translate raw Stellar blockchain transactions and accounts into plain-language explanations.

> **New to Stellar?** You don't need to know anything about the Stellar blockchain to use this SDK. Just pass in a transaction hash or account address and get back a human-readable summary.

## Installation

```bash
# npm
npm install @stellar-explain/sdk

# yarn
yarn add @stellar-explain/sdk

# pnpm
pnpm add @stellar-explain/sdk
```

## Quick start

```ts
import { StellarExplainClient } from '@stellar-explain/sdk';

const client = new StellarExplainClient();

// Explain a transaction
const tx = await client.explainTransaction(
  'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
);
console.log(tx.summary);
// → "Sent 10.00 XLM from GABC… to GXYZ…"

// Explain an account
const account = await client.explainAccount('GABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567');
console.log(account.summary);
// → "Account holding 250.00 XLM with 2 trustlines"
```

## Configuration

All options are optional. The client works out of the box pointing at the hosted API.

```ts
const client = new StellarExplainClient({
  baseUrl:   'https://api.stellarexplain.io', // default
  timeoutMs: 30_000,                          // default: 30 s
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | `"https://api.stellarexplain.io"` | Base URL of the Stellar Explain API |
| `timeoutMs` | `number` | `30000` | Per-request timeout in milliseconds |
| `fetchImpl` | `FetchImpl` | `globalThis.fetch` | Custom WHATWG-compatible fetch (see Node 16 section) |
| `logger` | `SdkLogger` | silent | Structured logger (`console`, `pino`, `winston`, …) |
| `plugins` | `SdkPlugin[]` | `[]` | Request/response interceptor hooks |
| `cache` | `CacheAdapter` | `MemoryCache` (5 min TTL) | Custom cache backend |

## API reference

### `client.explainTransaction(hash)`

Fetches a plain-language explanation for a Stellar transaction.

```ts
const tx = await client.explainTransaction(
  'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
);

console.log(tx.hash);            // '64-char hex hash'
console.log(tx.summary);         // 'Sent 10.00 XLM from … to …'
console.log(tx.status);          // 'success' | 'failed'
console.log(tx.ledger);          // 1234567
console.log(tx.created_at);      // '2024-01-15T10:30:00Z'
console.log(tx.fee_charged);     // '100' (stroops)
console.log(tx.memo);            // 'Hello' | null
console.log(tx.payments);        // PaymentExplanation[]
console.log(tx.skipped_operations); // number
```

Returns `Promise<TransactionExplanation>`.

- Throws `InvalidInputError` immediately if `hash` is not a valid 64-character hex string — no network call is made.
- Throws `NotFoundError` if the transaction does not exist (not retried).
- Throws `TimeoutError` if the request exceeds `timeoutMs`.

### `client.explainAccount(address)`

Fetches a plain-language explanation for a Stellar account.

```ts
const account = await client.explainAccount(
  'GABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567',
);

console.log(account.account_id);          // 'G…'
console.log(account.summary);             // 'Account holding …'
console.log(account.last_modified_ledger); // 1234567
console.log(account.subentry_count);      // 3
console.log(account.home_domain);         // 'example.com' | undefined
console.log(account.balances);            // AssetBalance[]
console.log(account.signers);             // Signer[]
```

Returns `Promise<AccountExplanation>`.

- Throws `InvalidInputError` immediately if `address` is not a valid Stellar G-address — no network call is made.
- Throws `NotFoundError` if the account does not exist (not retried).

### `client.health()`

Check the health of the Stellar Explain API.

```ts
const { status, horizon_reachable, version } = await client.health();
// status: 'ok' | 'degraded' | 'down'
```

Returns `Promise<HealthResponse>`.

### `client.clearCache()`

Evict all cached responses so the next calls hit the network.

```ts
client.clearCache();
```

## Error handling

All SDK errors extend `StellarExplainError`. Use `instanceof` to narrow the type:

```ts
import {
  StellarExplainClient,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  InvalidInputError,
  NetworkError,
  UpstreamError,
} from '@stellar-explain/sdk';

const client = new StellarExplainClient();

try {
  const tx = await client.explainTransaction(hash);
} catch (err) {
  if (err instanceof InvalidInputError) {
    // Bad hash format — fix the input, no point retrying
    console.error('Invalid input:', err.message);
  } else if (err instanceof NotFoundError) {
    // Transaction doesn't exist on the network
    console.error('Not found');
  } else if (err instanceof RateLimitError) {
    // Too many requests — respect the Retry-After header
    const waitMs = (err.retryAfter ?? 60) * 1000;
    await new Promise((r) => setTimeout(r, waitMs));
  } else if (err instanceof TimeoutError) {
    // Request took longer than timeoutMs
    console.error('Timed out');
  } else if (err instanceof NetworkError) {
    // DNS failure, connection refused, etc.
    console.error('Network error:', err.message);
  } else if (err instanceof UpstreamError) {
    // Unexpected response from the server
    console.error('Upstream error', err.statusCode, err.message);
  }
}
```

| Error class | When thrown | `statusCode` |
|---|---|---|
| `InvalidInputError` | Malformed hash or address | — |
| `NotFoundError` | API returned 404 | `404` |
| `RateLimitError` | API returned 429; check `.retryAfter` | `429` |
| `TimeoutError` | Request exceeded `timeoutMs` | — |
| `NetworkError` | DNS/TCP-level failure | — |
| `UpstreamError` | Non-JSON body or unexpected HTTP error | varies |

## Self-hosted setup

Point the client at your own backend by setting `baseUrl`:

```ts
const client = new StellarExplainClient({
  baseUrl: 'http://localhost:3000',
});
```

All other options work the same way against a local backend.

## Node 16 support

Node 18+ ships native `fetch` — no extra setup needed.

On **Node 16**, pass a fetch implementation via `fetchImpl`:

```bash
npm install undici
```

```ts
import { fetch } from 'undici';
import { StellarExplainClient } from '@stellar-explain/sdk';

const client = new StellarExplainClient({
  baseUrl: 'https://api.stellarexplain.io',
  fetchImpl: fetch,
});
```

## Contributing

See the monorepo [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup, testing, and pull request guidelines.
