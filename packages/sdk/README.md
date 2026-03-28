# @stellar-explain/sdk

TypeScript SDK for the [Stellar Explain](../../README.md) API.

## Installation

```bash
npm install @stellar-explain/sdk
```

## Quick start

```typescript
import { StellarExplainClient } from '@stellar-explain/sdk';

const client = new StellarExplainClient({ baseUrl: 'https://your-api-host' });

// Explain a transaction
const tx = await client.explainTransaction(
  'abc123...',
);

// Explain an account
const account = await client.explainAccount('GABC...');
```

## Request cancellation (AbortSignal)

Pass an `AbortSignal` to cancel a request early — for example when a React
component unmounts:

```typescript
const controller = new AbortController();

// Cancel when component unmounts
useEffect(() => () => controller.abort(), []);

const tx = await client.explainTransaction(hash, { signal: controller.signal });
```

When the signal fires the returned Promise rejects with
`TimeoutError('Request cancelled')`.

In-flight requests that are shared between multiple callers (via the built-in
deduplication map) remain in-flight even after a consumer cancels — only the
cancelling caller's Promise is rejected.

## Node 16 support

Node 18+ ships a native `fetch` implementation and requires no extra setup.

On **Node 16**, `globalThis.fetch` is not available. Pass a fetch implementation
via the `fetchImpl` option.

### Option A — pass undici's `fetch` directly (recommended for most cases)

```bash
npm install undici
```

```typescript
import { fetch } from 'undici';
import { StellarExplainClient } from '@stellar-explain/sdk';

const client = new StellarExplainClient({
  baseUrl: 'https://your-api-host',
  fetchImpl: fetch,
});
```

### Option B — `createUndiciFetch` with custom pool options

Use this when you need fine-grained control over undici's connection pool
(e.g. max concurrent connections, pipelining, TLS options).

```typescript
import { createUndiciFetch } from '@stellar-explain/sdk/adapters/undiciFetch';
import { StellarExplainClient } from '@stellar-explain/sdk';

const client = new StellarExplainClient({
  baseUrl: 'https://your-api-host',
  fetchImpl: createUndiciFetch({ connections: 10 }),
});
```

`createUndiciFetch` emits a `console.warn` if `globalThis.fetch` is already
present in the runtime, because in that case the adapter is unnecessary.

## API reference

### `new StellarExplainClient(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | — | API base URL (no trailing slash) |
| `timeoutMs` | `number` | `30000` | Per-request timeout in milliseconds |
| `fetchImpl` | `FetchImpl` | `globalThis.fetch` | Custom fetch implementation |

### `client.explainTransaction(hash, options?)`

Returns `Promise<TransactionExplanation>`.

| Option | Type | Description |
|---|---|---|
| `signal` | `AbortSignal` | Cancel the request |

### `client.explainAccount(address, options?)`

Returns `Promise<AccountExplanation>`.

| Option | Type | Description |
|---|---|---|
| `signal` | `AbortSignal` | Cancel the request |

### Errors

| Class | When |
|---|---|
| `TimeoutError` | Request timed out (`'Request timed out'`) or cancelled (`'Request cancelled'`) |
| `ApiRequestError` | API returned a non-2xx response; includes `.code` from the error body |
