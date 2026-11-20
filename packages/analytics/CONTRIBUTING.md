# Contributing to `@stellar-explain/analytics`

Analytics #123. This guide covers local setup, running tests, adding a new
event type, and cutting a changeset. It builds on Analytics #115
(`CHANGELOG.md` + changesets wiring).

Related docs:

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — pipeline, module boundaries, metrics.
- [`DASHBOARD_API.md`](./DASHBOARD_API.md) — ingest contract.
- [`RUNBOOK.md`](./RUNBOOK.md) — operating the pipeline in production.
- [`CHANGELOG.md`](./CHANGELOG.md) — release history.
- [`../../.changeset/README.md`](../../.changeset/README.md) — changeset policy
  (required for every package change).

## Prerequisites

- Node.js `>=18` (see `engines` in [`package.json`](./package.json)).
  Importing the package on an older runtime emits a one-time
  `[analytics]` warning via `src/utils/node-check.ts` instead of failing.
- npm 9+.

## Local setup

```bash
# from the monorepo root
npm install

# work inside the package
cd packages/analytics
npm run build     # tsc → dist/
npm run typecheck # tsc --noEmit
npm run lint      # eslint src
```

No browser globals are read at module load, so the package is SSR-safe.
`fetch` and `CompressionStream` are feature-detected only when an `HttpSink`
send is attempted.

## Running tests

```bash
cd packages/analytics
npm test                 # vitest run (jsdom by default)
npm run test:coverage    # vitest run --coverage
npm run test:watch       # watch mode
```

Conventions (see [`vitest.config.ts`](./vitest.config.ts)):

- Tests live under `tests/` and match `tests/**/*.test.{ts,tsx}`.
- React tests use `@testing-library/react` (`renderHook` / `render`).
- SSR tests set `// @vitest-environment node` and assert
  `typeof window === 'undefined'` (see
  `tests/react/AnalyticsProvider.ssr.test.tsx`).
- Integration tests live under `tests/integration/` and exercise
  `track → queue → flush → emitter` through the public barrel
  (`src/index.ts`), never internals.
- The smoke test (`tests/smoke.test.ts`, Analytics #124) constructs a real
  `AnalyticsClient` with a fake sink, tracks one event, flushes, and asserts
  delivery — run it as part of `npm test`, no network required.

Keep branch coverage at 100% for new modules: cover the happy path, the
disabled/opt-out branch, and the error/edge branch.

## Adding a new event type

Event builders live in `src/events/*.ts`. Follow the existing pattern
(e.g. `src/events/page-view.ts`):

1. **Create the builder** — `src/events/<name>.ts`:

   ```ts
   import type { AnalyticsEvent } from '../types.js';

   export interface <Name>Options {
     // plain JSON-only fields (no functions, no cycles)
   }

   export function create<Name>Event(options?: <Name>Options): AnalyticsEvent {
     return {
       name: '<snake_case_name>',
       timestamp: Date.now(),
       properties: { /* ... */ },
     };
   }
   ```

   Rules:
   - `name` is a non-empty `snake_case` string.
   - `properties` must be JSON-serializable (`validateProperties` rejects
     functions and cycles).
   - Prefer `Date.now()` numeric timestamps like the other builders.
   - Read browser globals defensively (`typeof window !== 'undefined'`).

2. **Export it** from [`src/index.ts`](./src/index.ts) if it is a public
   builder, and document the event shape in `ARCHITECTURE.md` when it adds a
   new pipeline concern.

3. **Add unit tests** — `tests/<name>.test.ts` (or extend
   `tests/events.test.ts`):
   - builder returns the expected `name` / `properties`,
   - defaults work when options are omitted,
   - invalid input is rejected where applicable,
   - the event round-trips through `AnalyticsClient.track()` + `flush()`
     to a fake emitter.

4. **Run the checks**:

   ```bash
   npm run typecheck && npm run lint && npm test
   ```

## Cutting a changeset (release process)

Every PR that touches `packages/analytics` — code, tests that change
behaviour, or package docs — must include a changeset (Analytics #115).
The release workflow consumes these files; **do not bump `version`
manually**.

```bash
# from the monorepo root
npm run changeset
```

- Select `@stellar-explain/analytics`.
- Choose `patch` (fix/docs), `minor` (new feature/event), or `major`
  (breaking API change).
- Write a one-sentence summary, e.g.:

  ```md
  ---
  "@stellar-explain/analytics": minor
  ---

  Add scroll-depth event builder.
  ```

- Commit the generated `.changeset/<name>.md` alongside your change.
- `CHANGELOG.md` is updated automatically at release time via
  `npm run version`.

## Pull-request checklist

- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.
- [ ] New branches covered (nested provider / re-render for React,
       supported + unsupported + non-Node for `node-check`).
- [ ] Changeset added.
- [ ] Docs updated (`ARCHITECTURE.md` / `RUNBOOK.md` / `README.md` if the
      contract changed).
