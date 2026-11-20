# Using @stellar-explain/cli in a Next.js CI Pipeline

This guide explains how to integrate the Stellar Explain CLI into a Next.js project's CI/CD pipeline to validate Stellar transactions during deployment.

## Overview

By running `stellar-explain` in your CI pipeline, you can:

- Validate that transactions are explainable before deploying
- Catch malformed or unexpected transaction data early
- Generate deployment reports with transaction summaries
- Ensure backend compatibility during upgrades

## Prerequisites

- A Next.js project (App Router or Pages Router)
- Node.js 18+ installed in your CI environment
- Access to the Stellar Explain backend (default: `https://stellar-explain-core.onrender.com`)

## Installation

Add the CLI as a dev dependency:

```bash
npm install --save-dev @stellar-explain/cli
```

## CI Integration Examples

### GitHub Actions

Create `.github/workflows/stellar-validate.yml`:

```yaml
name: Validate Stellar Transactions

on:
  pull_request:
    paths:
      - 'stellar/**/*.json'
      - 'data/transactions/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - name: Validate transaction files
        run: |
          for tx in data/transactions/*.json; do
            hash=$(jq -r '.hash' "$tx")
            echo "Validating $hash..."
            npx stellar-explain tx "$hash" --no-update-check || exit 1
          done
```

### GitLab CI

Add to `.gitlab-ci.yml`:

```yaml
stellar-validate:
  stage: test
  image: node:20
  script:
    - npm ci
    - |
      for tx in data/transactions/*.json; do
        hash=$(jq -r '.hash' "$tx")
        echo "Validating $hash..."
        npx stellar-explain tx "$hash" --no-update-check || exit 1
      done
  only:
    changes:
      - stellar/**/*.json
```

## Batch Validation

For projects with many transactions, use the batch command:

```bash
# Create a batch file: stellar/batch.json
# [
#   {"type": "tx", "identifier": "hash1..."},
#   {"type": "tx", "identifier": "hash2..."}
# ]

npx stellar-explain batch stellar/batch.json
```

## Using in Next.js Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "validate:stellar": "stellar-explain batch data/transactions/batch.json",
    "ci:check": "npm run build && npm run validate:stellar"
  }
}
```

## Error Handling

The CLI exits with code `1` on API errors and `2` on input errors. Use these codes in your pipeline to fail the build when transactions cannot be explained.

## Caching

The CLI caches responses locally. In CI, the cache directory (`~/.stellar-explain/`) is ephemeral, so each run fetches fresh data. Use the `--no-update-check` flag to suppress update notices.
