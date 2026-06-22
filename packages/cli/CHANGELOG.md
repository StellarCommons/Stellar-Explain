# @stellar-explain/cli Changelog

All notable changes to this package will be documented here.

## 0.1.0

### Initial release

A command-line interface for querying and explaining Stellar blockchain data via the Stellar Explain API.

#### Commands

- `tx <hash>` — Explain a Stellar transaction by hash
- `account <address>` — Explain a Stellar account by address
- `health` — Check API health status
- `batch <file>` — Explain multiple transaction hashes from a file (one per line)
- `watch <hash>` — Poll a transaction until it reaches 'success' or 'failed' status

#### Global options

- `--url <url>` — API base URL
- `--timeout <ms>` — Request timeout in milliseconds (default: 10000)
- `--retries <n>` — Retry attempts for network errors (default: 2)
- `--verbose` — Log request details to stderr
- `--json` — Output raw JSON
- `--version` — Display CLI version
- `--help` — Display help information

#### Command-specific options

**batch**
- `--output <path>` — Write results to a JSON file instead of stdout
- `--concurrency <n>` — Number of parallel requests (default: 3)

**watch**
- `--interval <ms>` — Polling interval in milliseconds (default: 4000)
- `--watch-timeout <ms>` — Maximum total time to wait in milliseconds (default: 120000)

#### Features

- Human-readable formatted output with optional color support
- JSON output mode for machine consumption
- Non-blocking update check on startup
- Node.js 18+ requirement enforcement
- Network retry logic with configurable attempts
- Input validation for transaction hashes and account addresses
