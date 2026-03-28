# Next.js App Router example

This example shows how to use `@stellar-explain/sdk` from a Next.js App Router
project without creating a separate client-side wrapper.

## Install

```bash
npm install @stellar-explain/sdk
```

Set your API base URL in `.env.local`:

```bash
STELLAR_EXPLAIN_API_URL=https://your-api-host
```

## 1. Create a singleton SDK client

Create `lib/stellarClient.ts`:

```typescript
import { StellarExplainClient } from '@stellar-explain/sdk';

declare global {
  // Avoid creating a new client on every hot reload in development.
  var stellarExplainClient: StellarExplainClient | undefined;
}

function createClient() {
  const baseUrl = process.env.STELLAR_EXPLAIN_API_URL;

  if (!baseUrl) {
    throw new Error('Missing STELLAR_EXPLAIN_API_URL');
  }

  return new StellarExplainClient({ baseUrl });
}

export const stellarClient =
  globalThis.stellarExplainClient ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.stellarExplainClient = stellarClient;
}
```

## 2. Use the SDK directly in a server component

Create `app/tx/[hash]/page.tsx`:

```typescript
import { ApiRequestError, TimeoutError } from '@stellar-explain/sdk';
import { notFound } from 'next/navigation';

import { stellarClient } from '@/lib/stellarClient';

type TransactionPageProps = {
  params: Promise<{ hash: string }>;
};

export default async function TransactionPage({
  params,
}: TransactionPageProps) {
  const { hash } = await params;

  try {
    const tx = await stellarClient.explainTransaction(hash);

    return (
      <main>
        <h1>Transaction</h1>
        <p>{tx.summary}</p>
        <p>Status: {tx.successful ? 'successful' : 'failed'}</p>

        <ul>
          {tx.payment_explanations.map((payment) => (
            <li key={`${payment.from}-${payment.to}-${payment.amount}`}>
              {payment.summary}
            </li>
          ))}
        </ul>
      </main>
    );
  } catch (err) {
    if (err instanceof ApiRequestError) {
      if (err.code === 'NOT_FOUND') {
        notFound();
      }

      return (
        <main>
          <h1>Unable to load transaction</h1>
          <p>
            API error: {err.code} - {err.message}
          </p>
        </main>
      );
    }

    if (err instanceof TimeoutError) {
      return (
        <main>
          <h1>Request timed out</h1>
          <p>{err.message}. Please try again.</p>
        </main>
      );
    }

    if (err instanceof Error) {
      return (
        <main>
          <h1>Unexpected error</h1>
          <p>{err.message}</p>
        </main>
      );
    }

    throw err;
  }
}
```

## 3. Wrap the SDK in an App Router API route

Create `app/api/tx/[hash]/route.ts`:

```typescript
import { ApiRequestError, TimeoutError } from '@stellar-explain/sdk';
import { NextResponse } from 'next/server';

import { stellarClient } from '@/lib/stellarClient';

type RouteContext = {
  params: Promise<{ hash: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { hash } = await context.params;

  try {
    const tx = await stellarClient.explainTransaction(hash);

    return NextResponse.json(tx);
  } catch (err) {
    if (err instanceof ApiRequestError) {
      const status = err.code === 'NOT_FOUND' ? 404 : 502;

      return NextResponse.json(
        {
          error: {
            code: err.code,
            message: err.message,
          },
        },
        { status }
      );
    }

    if (err instanceof TimeoutError) {
      return NextResponse.json(
        {
          error: {
            code: 'TIMEOUT',
            message: err.message,
          },
        },
        { status: 504 }
      );
    }

    if (err instanceof Error) {
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: err.message,
          },
        },
        { status: 500 }
      );
    }

    throw err;
  }
}
```

## Notes

- These examples run on the server, so your API base URL stays private.
- The singleton client in `lib/stellarClient.ts` keeps development hot reloads
  from creating duplicate SDK instances.
- You can follow the same pattern with `stellarClient.explainAccount(address)`
  in either a server component or a route handler.
