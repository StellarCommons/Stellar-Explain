# Changelog

All notable changes to `@stellar-explain/analytics` are documented here.
The project follows [Keep a Changelog](https://keepachangelog.com/) and
[Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- Batched, optionally compressed HTTP delivery with configurable headers.
- Pipeline metrics, lifecycle listeners, structured logging, event-size limits,
  environment context, and circuit-breaker visibility.
- Dead-letter inspection and recovery-friendly failure handling.
- Architecture and changesets documentation for contributors.

### Changed

- The client now treats sink failures as delivery failures instead of allowing
  rejected promises to escape the host application.
- HTTP requests use the backend ingest contract: a JSON array of event objects
  and a 2xx acknowledgement.

## 0.1.0

- Initial analytics package foundation.
