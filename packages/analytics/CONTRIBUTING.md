# Contributing to @stellar-explain/analytics

## Local Setup

1. Install dependencies:
   ```bash
   cd packages/analytics
   npm install
   ```

2. Run tests:
   ```bash
   npm test
   ```

3. Run linter:
   ```bash
   npm run lint
   ```

## How to Add a New Event

1. Add the event name to `src/types/events.ts` in the `EventName` array.
2. Update the `EventName` type union.
3. Create a factory function in the relevant module (e.g. `src/events/`).
4. Add the event name to `EVENT_NAMES` in `packages/core/src/routes/analytics.rs`.
5. Add UI call site in the frontend (e.g. `packages/ui/src/lib/analyticsEvents.ts`).
6. Write tests in `tests/events.test.ts`.

## How to Add a New Sink

1. Create a new file in `src/sinks/` (e.g. `FileSink.ts`).
2. Implement a class with a `send(event: AnalyticsEvent): void` method.
3. Handle errors gracefully — throw on unrecoverable failures.
4. Export the sink class from `src/sinks/index.ts`.
5. Write tests in `tests/sinks/`.

## Testing Conventions

- Use Vitest for all tests.
- Place tests in the `tests/` directory mirroring the source structure.
- Name test files `*.test.ts`.
- Aim for 80%+ code coverage.
