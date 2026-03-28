import {
  ApiRequestError,
  StellarExplainClient,
  TimeoutError,
} from '@stellar-explain/sdk';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';

class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

const baseUrl = process.env.STELLAR_EXPLAIN_API_URL ?? 'http://localhost:4000';
const txHash = process.argv[2];

function color(value: string, ansi: string): string {
  return `${ansi}${value}${RESET}`;
}

function usage(): string {
  return [
    'Usage:',
    '  npx tsx examples/node-script.ts <txHash>',
    '',
    'Optional env:',
    `  STELLAR_EXPLAIN_API_URL ${DIM}(default: ${baseUrl})${RESET}`,
  ].join('\n');
}

function requireTxHash(input: string | undefined): string {
  if (!input) {
    throw new InvalidInputError('Missing transaction hash.');
  }

  return input;
}

function normalizeError(error: unknown): Error {
  if (error instanceof ApiRequestError) {
    if (error.code === 'NOT_FOUND') {
      return new NotFoundError(
        'Transaction not found. Double-check the hash and try again.'
      );
    }

    if (error.code === 'BAD_REQUEST') {
      return new InvalidInputError(error.message);
    }
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('Unknown error');
}

async function main(): Promise<void> {
  const hash = requireTxHash(txHash);

  const client = new StellarExplainClient({ baseUrl });
  const tx = await client.explainTransaction(hash);

  console.log(color('Transaction Explanation', CYAN));
  console.log(`${color('Summary:', YELLOW)} ${tx.summary}`);
  console.log(
    `${color('Status:', YELLOW)} ${
      tx.successful ? color('successful', GREEN) : color('failed', RED)
    }`
  );
  console.log(
    `${color('Fee:', YELLOW)} ${tx.fee_explanation ?? color('Unknown', DIM)}`
  );

  console.log(color('Payments:', YELLOW));

  if (tx.payment_explanations.length === 0) {
    console.log(`  ${color('No payment operations found.', DIM)}`);
    return;
  }

  for (const [index, payment] of tx.payment_explanations.entries()) {
    console.log(`  ${color(`#${index + 1}`, CYAN)} ${payment.summary}`);
    console.log(`     from: ${payment.from}`);
    console.log(`     to:   ${payment.to}`);
    console.log(`     asset: ${payment.asset}`);
    console.log(`     amount: ${payment.amount}`);
  }
}

main().catch((error: unknown) => {
  const normalizedError = normalizeError(error);

  if (normalizedError instanceof InvalidInputError) {
    console.error(color(`Error: ${normalizedError.message}`, RED));
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  if (normalizedError instanceof NotFoundError) {
    console.error(color(normalizedError.message, RED));
    process.exitCode = 1;
    return;
  }

  if (normalizedError instanceof TimeoutError) {
    console.error(color(`Request timed out: ${normalizedError.message}`, RED));
    process.exitCode = 1;
    return;
  }

  console.error(
    color(`Unexpected error: ${normalizedError.message}`, RED)
  );
  process.exitCode = 1;
});
