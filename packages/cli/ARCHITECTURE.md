# CLI Architecture

## Command Flow

```
index.ts
  └─ registers global error handler
  └─ parses CLI args via commander
  └─ commands/explain.ts
       └─ resolves config (env → file → flags)
       └─ detects input type (address / tx-hash)
       └─ calls client/api.ts
       └─ formats output (json.ts or text.ts)
       └─ writes result (stdout or --output file)
```

## Config Resolution Order

1. Defaults (hardcoded)
2. Config file (`.stellar-explain.json` in cwd or home)
3. Environment variables (`STELLAR_EXPLAIN_*`, `NO_COLOR`)
4. CLI flags (highest priority)

## Module Layout

| Path | Responsibility |
|---|---|
| `src/commands/` | One file per CLI command |
| `src/client/`   | HTTP client and API types |
| `src/config/`   | Config loading, env, validation |
| `src/formatters/`| JSON and text output formatters |
| `src/utils/`    | Shared utilities (spinner, color, time…) |
| `tests/`        | Unit tests mirroring src/ layout |
