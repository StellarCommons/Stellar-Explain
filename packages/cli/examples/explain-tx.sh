#!/usr/bin/env bash
# Example: explain a Stellar transaction by hash

set -euo pipefail

TX_HASH="${1:-}"
if [ -z "$TX_HASH" ]; then
  echo "Usage: $0 <tx-hash>"
  exit 1
fi

stellar-explain "$TX_HASH"
