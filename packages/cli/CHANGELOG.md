# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-07-29

### Added

- Initial release of `@stellar-explain/cli`
- `tx <hash>` command — explain a Stellar transaction by hash
- `account <address>` command — explain a Stellar account by address
- `health` command — check backend API health
- `batch <file>` command — process a batch of lookups from a JSON file
- `cache clear` command — clear local response cache
- `version` command — show CLI and API versions
- `--url` option — configure a custom backend URL
- `--no-update-check` option — disable background update check
- Local disk cache with in-memory fallback (`~/.stellar-explain/`)
- Background update check on startup
- Colored error output formatting
