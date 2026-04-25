# SDK Troubleshooting

Practical fixes for common integration problems with `@stellar-explain/sdk`.

## `fetch is not defined` in Node 16

Node 16 does not ship a global `fetch`.

Use `undici` and pass it into the client:

```bash
npm install undici
```

```typescript
import { fetch } from 'undici';
import { StellarExplainClient } from '@stellar-explain/sdk';

const client = new StellarExplainClient({
  baseUrl: 'http://localhost:4000',
  fetchImpl: fetch,
});
```

If you need custom pool settings, use the adapter entry point instead:

```typescript
import { createUndiciFetch } from '@stellar-explain/sdk/adapters/undiciFetch';
import { StellarExplainClient } from '@stellar-explain/sdk';

const client = new StellarExplainClient({
  baseUrl: 'http://localhost:4000',
  fetchImpl: createUndiciFetch({ connections: 10 }),
});
```

## Browser CORS errors

If you call the backend directly from the browser and see CORS failures, do not
fight that in the frontend bundle. Use a server-side proxy route instead.

Pattern:

```text
Browser -> your frontend server -> Stellar Explain API
```

Example with a frontend API route:

```typescript
const res = await fetch(`/api/tx/${hash}`);
```

Then let your server talk to:

```text
http://localhost:4000
```

This keeps browser requests same-origin and avoids shipping backend URLs and
headers into client code.

## `InvalidInputError: must start with G`

The current SDK snapshot does not export `InvalidInputError`. In practice, you
will usually see an `ApiRequestError` with code `BAD_REQUEST`, or this message
may come from your own wrapper around the SDK.

For account lookups, the input must be a Stellar account address:

- starts with `G`
- uppercase base32
- 56 characters total

Quick validation:

```typescript
const isAccount = /^G[A-Z2-7]{55}$/.test(address);
```

If the value is a transaction hash, call `explainTransaction(...)` instead of
`explainAccount(...)`.

## Cache returning stale data after a backend update

The current SDK does not include a built-in persistent response cache, so there
is no SDK-level `clearCache()` method in this repo snapshot.

What to do instead:

- if you added your own cache wrapper around the SDK, clear that cache after a deploy
- if you memoize SDK responses in app state, invalidate that state
- if you create one long-lived cache object in your app, recreate it after the backend changes

If your app layer exposes a helper, it might look like this:

```typescript
clearCache();
```

That is an application-level pattern, not a built-in SDK API today.

## TypeScript error on `data.balances`

If you are migrating from raw Horizon responses, this usually means you are
still reading low-level Stellar account JSON instead of the SDK's higher-level
account shape.

`explainAccount(...)` returns `AccountExplanation`, which does **not** expose
`data.balances`. It gives you:

- `summary`
- `xlm_balance`
- `asset_count`
- `signer_count`
- `home_domain`
- `org_name`
- `flag_descriptions`

So replace code like:

```typescript
const firstBalance = data.balances[0];
```

with SDK fields like:

```typescript
const account = await client.explainAccount(address);
console.log(account.xlm_balance);
```

If you still work with array indexing elsewhere and TypeScript complains because
`noUncheckedIndexedAccess` is enabled, guard the value first:

```typescript
const firstBalance = data.balances[0];

if (!firstBalance) {
  throw new Error('Missing balance entry');
}
```

## `RateLimitError` in production

The current SDK snapshot does not export a dedicated `RateLimitError`. Rate
limit responses will typically surface as `ApiRequestError`.

Handle them by checking your backend error code convention:

```typescript
import { ApiRequestError } from '@stellar-explain/sdk';

try {
  await client.explainTransaction(hash);
} catch (err) {
  if (err instanceof ApiRequestError) {
    if (err.code === 'RATE_LIMITED') {
      console.error('Back off and retry later.');
    }
  }
}
```

If your platform or proxy adds a `retryAfter` value, respect it before
retrying. If rate limits are a recurring production problem, self-hosting the
API gives you direct control over limits and capacity.

## Build error: `Cannot use import statement in a module`

This usually means your runtime/build config expects CommonJS while the SDK is
published as ESM-first.

Practical fixes:

1. Use ESM in your app:

```json
{
  "type": "module"
}
```

2. Use TypeScript module settings that align with modern Node:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

3. Import with standard ESM syntax:

```typescript
import { StellarExplainClient } from '@stellar-explain/sdk';
```

If you are locked into a CommonJS runtime, the safest short-term fix is to load
the SDK from an ESM-compatible boundary instead of mixing `require(...)` and
`import` in the same path.
