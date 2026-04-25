# SDK Architecture Guide

This document is for contributors who want a fast mental model of
`@stellar-explain/sdk` before changing it.

The SDK is intentionally small:

- one public client
- one optional Node 16 adapter
- shared error and type definitions
- no runtime dependencies in the main entry point

Some concepts below describe both the current implementation and the intended
extension boundaries. Where a subsystem does not exist yet, that is called out
explicitly so contributors do not mistake design goals for shipped behavior.

## Current module layout

```text
packages/sdk/src/
|-- index.ts
|-- client/
|   `-- StellarExplainClient.ts
|-- errors/
|   `-- index.ts
|-- types/
|   `-- index.ts
`-- adapters/
    `-- undiciFetch.ts
```

## Module dependency graph

```text
                         +----------------------+
                         |  src/types/index.ts  |
                         +----------------------+
                                   ^
                                   |
+----------------------+   +-------------------------------+
|  src/errors/index.ts |<--| src/client/StellarExplain... |
+----------------------+   +-------------------------------+
           ^                            ^
           |                            |
           +-------------+--------------+
                         |
                  +-------------+
                  | src/index.ts|
                  +-------------+
                         ^
                         |
         +----------------------------------+
         | src/adapters/undiciFetch.ts      |
         | imports types only, not index.ts |
         +----------------------------------+
```

### Dependency rules

- `src/index.ts` is the public entry point.
- `src/client/StellarExplainClient.ts` owns request orchestration.
- `src/errors/index.ts` contains SDK-specific error classes and no transport
  logic.
- `src/types/index.ts` contains request and response contracts only.
- `src/adapters/undiciFetch.ts` is opt-in and intentionally not re-exported
  from the main entry point.

That split keeps the main SDK usable in browsers and Node 18+ without pulling
in optional transport code.

## Request lifecycle

The contributor model for a request is:

```text
validate
  |
  v
cache check
  |
  v
dedup check
  |
  v
fetch
  |
  v
retry
  |
  v
validate response
  |
  v
cache set
  |
  v
return
```

In the current codebase, only part of that lifecycle is implemented:

```text
validate request input
  current: minimal
  - constructor trims one trailing slash from baseUrl
  - public methods build stable keys such as "tx:<hash>" and "account:<address>"
  - there is no runtime schema validation for method arguments yet

cache check
  current: not implemented

dedup check
  current: implemented with inFlight Map<string, Promise<unknown>>

fetch
  current: implemented in fetchJson()

retry
  current: not implemented

validate response
  current: partial
  - checks HTTP status
  - parses JSON
  - wraps non-2xx payloads in ApiRequestError
  - trusts the success payload shape after JSON parsing

cache set
  current: not implemented

return
  current: implemented
  - resolve typed data
  - or throw TimeoutError / ApiRequestError / original unexpected error
```

## Request flow in the current implementation

`StellarExplainClient` exposes two public methods:

- `explainTransaction(hash, options?)`
- `explainAccount(address, options?)`

Both methods follow the same path:

```text
public method
  |
  v
dedupe(key, networkFactory, consumerSignal)
  |
  +--> if consumer signal already aborted:
  |      throw TimeoutError("Request cancelled")
  |
  +--> if key exists in inFlight:
  |      reuse the existing Promise
  |
  +--> else:
  |      startRequest(key, networkFactory)
  |        |
  |        +--> store Promise in inFlight
  |        +--> remove it when settled
  |
  +--> if no consumer signal:
  |      return shared network Promise
  |
  `--> if consumer signal exists:
         create timeout controller
         merge timeout signal + consumer signal
         Promise.race(networkPromise, cancellationPromise)
```

The network factory eventually calls `fetchJson(path)`:

```text
fetchJson(path)
  |
  +--> create internal AbortController timeout
  +--> fetch(baseUrl + path, { signal, headers })
  +--> await res.json()
  +--> if !res.ok:
  |      throw ApiRequestError
  +--> if fetch aborted:
  |      throw TimeoutError("Request timed out")
  `--> return parsed payload
```

## Why cache, dedup, and plugins are separate concerns

Even though only dedup exists today, contributors should keep these concerns
separate instead of collapsing them into one mechanism.

### Cache

Cache answers:

```text
"Do we already have a finished value we can reuse?"
```

Properties:

- stores settled results, not active work
- usually needs eviction policy, TTL, and invalidation rules
- affects freshness and memory behavior

### Dedup map

Dedup answers:

```text
"Is the same request already in flight right now?"
```

Properties:

- stores active Promises only
- entries disappear as soon as the request settles
- does not make data stale because it does not outlive the network call

### Plugin system

Plugins answer:

```text
"What observers or extensions should run around the request lifecycle?"
```

Properties:

- should not own storage
- should not decide transport identity
- should not silently swallow core client errors

Keeping these concerns separate prevents subtle bugs:

- a cache miss should not create plugin side effects twice for one shared call
- a plugin should not accidentally extend the lifetime of dedup entries
- dedup should not become a stale-data cache by accident

## Plugin execution order

There is no plugin system in the current SDK. This section documents the
intended contract so future work does not blur responsibilities.

Recommended order:

```text
1. onRequest
2. cache lookup hook
3. dedup lookup hook
4. transport hook before fetch
5. fetch / retry loop
6. response validation hook
7. cache write hook
8. onSuccess
9. onError (when any earlier step throws)
10. rethrow the error
```

`onError` hooks must be observational only. They can log, add telemetry, or
attach metadata, but they must not prevent error propagation.

Why this matters:

- callers rely on `TimeoutError` and `ApiRequestError` for control flow
- swallowing an error inside a plugin would break that contract
- deduped callers must all observe the same failure, not a mixture of handled
  and unhandled results

In other words, `onError` can react to an error, but it cannot convert a failed
request into a success without changing the public semantics of the SDK.

## AbortController timeout and consumer AbortSignal merging

The SDK has two different cancellation sources:

- the client's internal timeout
- the caller's optional `AbortSignal`

These are merged in `dedupe()` so a single consumer can stop waiting without
aborting the shared network request for everyone else.

```text
internal timeout signal ----+
                            +--> mergeSignals(...) --> merged signal
consumer abort signal ------+
```

The important behavior is:

- the shared fetch uses only the internal timeout signal
- the consumer-facing Promise races the shared fetch against the merged signal
- if the consumer cancels, that caller gets `TimeoutError("Request cancelled")`
- the underlying fetch continues, and other callers can still reuse it

This separation is what makes dedup safe. If the consumer signal were passed
directly into `fetch()`, one caller could abort the shared network request for
every other caller waiting on the same key.

## Retry behavior

There is no retry loop in the current implementation.

If retries are added later, they should live between `fetch` and
`validate response` in the lifecycle and obey these constraints:

- only retry errors that are safe and transient
- do not retry validation failures caused by bad caller input
- preserve timeout semantics across the whole operation, not per attempt only
- keep dedup keyed to the whole logical request, not each retry attempt

## Response validation

The current client validates responses at the transport level, not at the full
schema level.

Today it validates:

- HTTP success vs failure
- JSON parsing
- conversion of non-2xx error bodies into `ApiRequestError`

Today it does not validate:

- success payload shape with a runtime schema validator
- field-level invariants after parsing

That is a deliberate simplicity tradeoff. If runtime schema validation is added
later, keep it isolated to the response-validation stage rather than mixing it
into fetch or dedup logic.

## Runtime dependencies: why there are effectively none

The main SDK entry point has no runtime dependencies beyond platform APIs such
as `fetch`, `AbortController`, `Promise`, and `Map`.

Why this matters:

- browser bundles stay small
- Node 18+ works without extra installation
- contributors can reason about failures without a deep dependency tree
- release risk stays lower because fewer transitive packages can break users

The optional `undici` adapter is kept out of the main path on purpose:

- it is imported directly from `@stellar-explain/sdk/adapters/undiciFetch`
- `undici` is a peer dependency, not a hard dependency of the main entry point
- consumers who do not need Node 16 support never pay for it

To keep it that way:

- avoid adding runtime libraries for validation, retries, caching, or hooks
  unless the standard platform primitives are clearly insufficient
- keep optional features behind secondary entry points
- prefer type-only imports where possible
- do not re-export environment-specific adapters from `src/index.ts`

## ESM and CJS packaging

The current package does not yet ship a dual ESM + CJS build.

Current state:

```text
source: TypeScript
compiler: tsc
module target: NodeNext
published JS: dist/*.js as ESM
published types: dist/*.d.ts
```

That means contributors should treat the SDK as ESM-first today.

If dual build support is added later, the usual shape would be:

```text
src/*.ts
  |
  +--> ESM build -> dist/esm/*
  |
  `--> CJS build -> dist/cjs/*

package.json exports
  |
  +--> "import"  -> ESM entry
  `--> "require" -> CJS entry
```

Why both formats are commonly needed:

- ESM is the standard format for modern bundlers, browsers, and current Node
- CJS still matters for older Node setups, test runners, and tools that call
  `require()`

If the package gains a dual build later, contributors should keep these rules:

- one source tree, not duplicated logic
- matching public APIs across both outputs
- identical error semantics across formats
- optional adapters should keep working from both export paths

## Contributor guidelines

When changing the SDK:

- keep transport, typing, and optional-environment support decoupled
- preserve the distinction between in-flight deduplication and settled-value
  caching
- do not let optional hooks or plugins change public error propagation
- prefer standard platform APIs over new runtime dependencies
- if you add cache, retry, plugin, or dual-build support, document the new
  lifecycle stage and keep it isolated to its own concern
