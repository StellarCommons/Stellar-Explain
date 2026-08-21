# schemas/

This directory contains TypeScript type definitions that mirror the Rust backend's
JSON response shapes. They exist for use by frontend contributors and tooling that
needs a typed contract for the API without running the Rust server.

## Files

- **explanation-schema.ts** — TypeScript interfaces for all API response types:
  `TransactionExplanation`, `OperationExplanation`, `PaymentExplanation`,
  `AccountExplanationResponse`, `AccountHistoryResponse`, `HealthResponse`, and `ApiError`
- **explanation-builder.ts** — Helper functions for constructing explanation objects
  in tests and fixtures
- **schema-migration.ts** — Utilities for migrating between API response shapes
  as the API evolves

## Notes

These files are **not** compiled or referenced by the Rust backend. They are
reference material for frontend developers and are kept here (rather than in
`packages/ui`) so they can be consumed independently of the Next.js app.

For the canonical source of truth, see the Rust structs in:
- `src/explain/transaction.rs` — `TransactionExplanation`, `OperationExplanation`
- `src/explain/operation/payment.rs` — `PaymentExplanation`
- `src/routes/account.rs` — `AccountExplanationResponse`, `AccountHistoryResponse`
- `src/routes/health.rs` — `HealthResponse`
