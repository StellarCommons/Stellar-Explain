#!/usr/bin/env bash
set -euo pipefail

# Explain a single transaction by hash
# Usage: ./explain-tx.sh <transaction-hash>

HASH="${1:?Usage: $0 <transaction-hash>}"

stellar-explain tx "$HASH"
