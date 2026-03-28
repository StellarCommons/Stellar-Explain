# Migrating from raw fetch to `@stellar-explain/sdk`

This guide is for codebases that already call the Stellar Explain API with
plain `fetch` and want to move to the SDK with minimal churn.

## Why migrate

The SDK gives you:

- typed request/response shapes
- typed error classes instead of manual `res.ok` branching
- built-in request timeout handling
- in-flight request deduplication for identical concurrent calls

It does **not** currently add a persistent response cache. If you already have
your own cache layer, keep it.

## Install

```bash
npm install @stellar-explain/sdk
```

Create one client and reuse it:

```typescript
import { StellarExplainClient } from '@stellar-explain/sdk';

export const client = new StellarExplainClient({
  baseUrl: 'http://localhost:4000',
});
```

## Transaction fetch: before -> after

### Before

```typescript
type ApiError = {
  error: {
    code: string;
    message: string;
  };
};

type TransactionExplanation = {
  transaction_hash: string;
  successful: boolean;
  summary: string;
  payment_explanations: Array<{
    summary: string;
    from: string;
    to: string;
    asset: string;
    amount: string;
  }>;
  skipped_operations: number;
  memo_explanation: string | null;
  fee_explanation: string | null;
  ledger_closed_at: string | null;
  ledger: number | null;
};

async function fetchTransaction(hash: string): Promise<TransactionExplanation> {
  const res = await fetch(`http://localhost:4000/api/tx/${hash}`, {
    headers: { Accept: 'application/json' },
  });

  const data = (await res.json()) as TransactionExplanation | ApiError;

  if (!res.ok) {
    throw new Error(`API error: ${(data as ApiError).error.message}`);
  }

  return data as TransactionExplanation;
}
```

### After

```typescript
import { StellarExplainClient } from '@stellar-explain/sdk';

const client = new StellarExplainClient({
  baseUrl: 'http://localhost:4000',
});

const tx = await client.explainTransaction(hash);
console.log(tx.summary);
```

## Account fetch: before -> after

### Before

```typescript
type AccountExplanation = {
  address: string;
  summary: string;
  xlm_balance: string;
  asset_count: number;
  signer_count: number;
  home_domain: string | null;
  org_name: string | null;
  flag_descriptions: string[];
};

async function fetchAccount(address: string): Promise<AccountExplanation> {
  const res = await fetch(`http://localhost:4000/api/account/${address}`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  return (await res.json()) as AccountExplanation;
}
```

### After

```typescript
import { StellarExplainClient } from '@stellar-explain/sdk';

const client = new StellarExplainClient({
  baseUrl: 'http://localhost:4000',
});

const account = await client.explainAccount(address);
console.log(account.summary);
```

## Error handling: status codes -> typed errors

With raw `fetch`, most apps do some version of:

```typescript
if (res.status === 404) {
  // not found
}

if (res.status === 400) {
  // invalid input
}
```

With the SDK, you catch typed errors instead:

```typescript
import {
  ApiRequestError,
  StellarExplainClient,
  TimeoutError,
} from '@stellar-explain/sdk';

const client = new StellarExplainClient({
  baseUrl: 'http://localhost:4000',
});

try {
  const tx = await client.explainTransaction(hash);
  console.log(tx.summary);
} catch (err) {
  if (err instanceof ApiRequestError) {
    switch (err.code) {
      case 'NOT_FOUND':
        console.error('Transaction not found.');
        break;
      case 'BAD_REQUEST':
        console.error('Invalid input:', err.message);
        break;
      default:
        console.error('API error:', err.code, err.message);
    }
  } else if (err instanceof TimeoutError) {
    console.error('Request timed out:', err.message);
  } else {
    throw err;
  }
}
```

## Cache differences

If you are migrating from raw `fetch`, be aware of what the SDK does and does
not do today:

- It **does** deduplicate identical concurrent requests while they are in flight.
- It **does not** persist responses in memory after the request settles.
- It **does not** include localStorage, IndexedDB, Redis, or disk caching.

So if your raw-fetch layer already had a response cache, you should keep that
separate for now.

## Types you can delete

After migrating, you can usually delete local copies of:

- transaction response types that mirror `TransactionExplanation`
- account response types that mirror `AccountExplanation`
- payment item types that mirror `PaymentExplanation`
- custom API error envelope types that mirror `ApiError`
- ad hoc fetch function signatures that mirror `FetchImpl`

The SDK exports these types for you:

- `TransactionExplanation`
- `AccountExplanation`
- `PaymentExplanation`
- `ApiError`
- `FetchImpl`
- `RequestOptions`
- `StellarExplainClientOptions`

## Config options summary

`new StellarExplainClient(options)` supports:

| Option | Type | Default | Notes |
|---|---|---|---|
| `baseUrl` | `string` | required | API base URL without a trailing slash |
| `timeoutMs` | `number` | `30000` | Per-request timeout |
| `fetchImpl` | `FetchImpl` | `globalThis.fetch` | Useful for Node 16 or custom transport |

## Migration checklist

1. Install `@stellar-explain/sdk`.
2. Create and reuse one `StellarExplainClient`.
3. Replace manual transaction fetch helpers with `client.explainTransaction(...)`.
4. Replace manual account fetch helpers with `client.explainAccount(...)`.
5. Replace `res.status` branching with `ApiRequestError` and `TimeoutError`.
6. Delete duplicated local response/error types where the SDK already exports them.
7. Keep any existing response cache separate, because the SDK does not provide one yet.
