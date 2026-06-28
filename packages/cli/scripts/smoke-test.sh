#!/usr/bin/env bash
# Smoke test: build the CLI and run basic sanity checks

set -euo pipefail

echo "==> Building CLI..."
npm run build

BINARY="node dist/index.js"

echo "==> Checking --version..."
$BINARY --version

echo "==> Checking --help..."
$BINARY --help

echo "==> All smoke tests passed."
