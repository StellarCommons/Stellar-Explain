#!/usr/bin/env bash
set -euo pipefail

# Explain a single account by public address
# Usage: ./explain-account.sh <public-address>

ADDRESS="${1:?Usage: $0 <public-address>}"

stellar-explain account "$ADDRESS"
