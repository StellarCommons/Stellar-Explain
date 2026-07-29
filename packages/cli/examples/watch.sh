#!/usr/bin/env bash
set -euo pipefail

# Watch a transaction hash, re-fetching every N seconds
# Usage: ./watch.sh <transaction-hash> [interval-seconds]

HASH="${1:?Usage: $0 <transaction-hash> [interval-seconds]}"
INTERVAL="${2:-10}"

echo "Watching transaction $HASH every ${INTERVAL}s..."
while true; do
  echo "--- $(date) ---"
  stellar-explain tx "$HASH"
  sleep "$INTERVAL"
done
