import { FormEvent, useMemo, useState } from 'react';
import {
  ApiRequestError,
  StellarExplainClient,
  TimeoutError,
  type AccountExplanation,
  type TransactionExplanation,
} from '@stellar-explain/sdk';

type ResultState =
  | { kind: 'transaction'; data: TransactionExplanation }
  | { kind: 'account'; data: AccountExplanation }
  | null;

type ErrorState =
  | {
      code: string;
      message: string;
    }
  | null;

const client = new StellarExplainClient({
  baseUrl: 'http://localhost:4000',
});

function isAccountAddress(value: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(value);
}

function isTransactionHash(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

export default function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState>(null);
  const [result, setResult] = useState<ResultState>(null);

  const detectedType = useMemo(() => {
    const trimmed = input.trim();

    if (isAccountAddress(trimmed)) {
      return 'account';
    }

    if (isTransactionHash(trimmed)) {
      return 'transaction';
    }

    return null;
  }, [input]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = input.trim();

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (isAccountAddress(trimmed)) {
        const account = await client.explainAccount(trimmed);
        setResult({ kind: 'account', data: account });
        return;
      }

      if (isTransactionHash(trimmed)) {
        const transaction = await client.explainTransaction(trimmed);
        setResult({ kind: 'transaction', data: transaction });
        return;
      }

      setError({
        code: 'INVALID_INPUT',
        message:
          'Enter a 64-character transaction hash or a Stellar G-address.',
      });
    } catch (caughtError) {
      if (caughtError instanceof ApiRequestError) {
        setError({
          code: caughtError.code,
          message: caughtError.message,
        });
        return;
      }

      if (caughtError instanceof TimeoutError) {
        setError({
          code: 'TIMEOUT',
          message: caughtError.message,
        });
        return;
      }

      if (caughtError instanceof Error) {
        setError({
          code: 'UNKNOWN_ERROR',
          message: caughtError.message,
        });
        return;
      }

      setError({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Stellar Explain React Example</h1>
      <p>
        This provisional example uses the existing SDK client directly with
        React. The requested hooks/provider API does not exist in the current
        repository snapshot yet.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="resource-input">Transaction hash or G-address</label>
        <br />
        <input
          id="resource-input"
          name="resource"
          onChange={(event) => setInput(event.target.value)}
          placeholder="Enter a transaction hash or Stellar account"
          value={input}
        />
        <button disabled={loading} type="submit">
          {loading ? 'Loading...' : 'Fetch explanation'}
        </button>
      </form>

      <p>
        Detected type:{' '}
        {detectedType ? <strong>{detectedType}</strong> : 'unknown'}
      </p>

      {error ? (
        <section>
          <h2>Error</h2>
          <p>Code: {error.code}</p>
          <p>Message: {error.message}</p>
        </section>
      ) : null}

      {result ? (
        <section>
          <h2>Result</h2>
          <p>Type: {result.kind}</p>
          <p>Summary: {result.data.summary}</p>
        </section>
      ) : null}
    </main>
  );
}
