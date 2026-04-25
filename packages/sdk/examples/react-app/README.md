# React + Vite example

This is a minimal single-page React + Vite example for the SDK.

Important note:

- The originally requested `useTransaction`, `useAccount`, and
  `StellarExplainProvider` APIs do not exist in the current repository snapshot.
- Because of that, this example demonstrates the current direct-client approach
  instead, using `StellarExplainClient` from `@stellar-explain/sdk`.
- The app keeps the UI intentionally simple and focuses on correctness and
  clarity.

## What it does

- accepts one input value
- detects a transaction hash vs a Stellar `G...` account address
- calls the SDK client directly
- shows loading, error, and result summary states

## Run

From this directory:

```bash
npm install
npm run dev
```

The Vite dev server will start locally and the app will call:

```text
http://localhost:4000
```

Make sure the Stellar Explain backend is running there before submitting a
transaction hash or account address.
