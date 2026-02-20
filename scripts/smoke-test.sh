#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# Stellar Explain — Smoke Test
#
# Verifies the full stack is connected and responding correctly:
#   1. Backend health check (localhost:4000)
#   2. Backend transaction response shape validation
#   3. Frontend proxy health check (localhost:3000)
#   4. Frontend proxy transaction response — compared against direct backend
#
# Usage:
#   chmod +x scripts/smoke-test.sh
#   ./scripts/smoke-test.sh
#
# Exit codes:
#   0 — all checks passed
#   1 — one or more checks failed
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────

BACKEND_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:3000"

# Known testnet transaction hash — used across all checks
TX_HASH="b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020"

# Required fields in a valid TransactionExplanation response
REQUIRED_FIELDS=("transaction_hash" "successful" "summary" "payment_explanations" "skipped_operations")

# ── Colours ───────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No colour

# ── Helpers ───────────────────────────────────────────────────────────────────

PASSED=0
FAILED=0

pass() {
  echo -e "  ${GREEN}✓${NC} $1"
  PASSED=$((PASSED + 1))
}

fail() {
  echo -e "  ${RED}✗${NC} $1"
  FAILED=$((FAILED + 1))
}

section() {
  echo ""
  echo -e "${BLUE}▶ $1${NC}"
}

# ── Check 1 — Backend Health ──────────────────────────────────────────────────

section "Check 1 — Backend health (${BACKEND_URL}/health)"

HEALTH_RESPONSE=$(curl -s --max-time 5 "${BACKEND_URL}/health" 2>/dev/null || echo "")

if [ -z "$HEALTH_RESPONSE" ]; then
  fail "Backend is not reachable at ${BACKEND_URL}"
  echo ""
  echo -e "${YELLOW}  → Make sure the Rust backend is running:${NC}"
  echo "     cd packages/core && cargo run"
  echo "     OR: docker-compose up --build"
  echo ""
  exit 1
else
  pass "Backend is reachable — response: ${HEALTH_RESPONSE}"
fi

# ── Check 2 — Backend Transaction Response Shape ──────────────────────────────

section "Check 2 — Backend transaction response shape"

TX_RESPONSE=$(curl -s --max-time 10 "${BACKEND_URL}/tx/${TX_HASH}" 2>/dev/null || echo "")

if [ -z "$TX_RESPONSE" ]; then
  fail "No response from ${BACKEND_URL}/tx/${TX_HASH}"
  FAILED=$((FAILED + 1))
else
  # Validate each required field exists in the response
  ALL_FIELDS_PRESENT=true
  for field in "${REQUIRED_FIELDS[@]}"; do
    if echo "$TX_RESPONSE" | grep -q "\"${field}\""; then
      pass "Field '${field}' is present"
    else
      fail "Field '${field}' is MISSING from response"
      ALL_FIELDS_PRESENT=false
    fi
  done

  if [ "$ALL_FIELDS_PRESENT" = true ]; then
    pass "All required TransactionExplanation fields are present"
  fi
fi

# ── Check 3 — Frontend Proxy Health ──────────────────────────────────────────

section "Check 3 — Frontend proxy health (${FRONTEND_URL}/api/health)"

PROXY_HEALTH=$(curl -s --max-time 5 "${FRONTEND_URL}/api/health" 2>/dev/null || echo "")

if [ -z "$PROXY_HEALTH" ]; then
  fail "Frontend proxy is not reachable at ${FRONTEND_URL}"
  echo ""
  echo -e "${YELLOW}  → Make sure the Next.js frontend is running:${NC}"
  echo "     cd packages/ui && npm run dev"
  echo "     OR: docker-compose up --build"
  echo ""
  FAILED=$((FAILED + 1))
else
  pass "Frontend proxy is reachable — response: ${PROXY_HEALTH}"
fi

# ── Check 4 — Frontend Proxy Transaction ─────────────────────────────────────

section "Check 4 — Frontend proxy transaction (${FRONTEND_URL}/api/tx/${TX_HASH})"

PROXY_TX=$(curl -s --max-time 10 "${FRONTEND_URL}/api/tx/${TX_HASH}" 2>/dev/null || echo "")

if [ -z "$PROXY_TX" ]; then
  fail "No response from frontend proxy at ${FRONTEND_URL}/api/tx/${TX_HASH}"
  FAILED=$((FAILED + 1))
else
  # Check the proxy response contains the correct transaction hash
  if echo "$PROXY_TX" | grep -q "\"${TX_HASH}\""; then
    pass "Proxy returned correct transaction hash"
  else
    fail "Proxy response does not contain the expected transaction hash"
  fi

  # Compare proxy response against direct backend response
  if [ "$PROXY_TX" = "$TX_RESPONSE" ]; then
    pass "Proxy response matches direct backend response exactly"
  else
    # They might differ slightly due to formatting — check key fields instead
    PROXY_MATCH=true
    for field in "${REQUIRED_FIELDS[@]}"; do
      if ! echo "$PROXY_TX" | grep -q "\"${field}\""; then
        fail "Field '${field}' missing from proxy response"
        PROXY_MATCH=false
      fi
    done
    if [ "$PROXY_MATCH" = true ]; then
      pass "Proxy response contains all required fields"
    fi
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "─────────────────────────────────────────────"

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed (${PASSED}/${PASSED})${NC}"
  echo ""
  echo "  Full stack is connected and working:"
  echo "  Browser → Next.js (${FRONTEND_URL}) → Rust backend (${BACKEND_URL}) → Horizon"
  echo ""
  exit 0
else
  echo -e "${RED}✗ ${FAILED} check(s) failed, ${PASSED} passed${NC}"
  echo ""
  echo "  See above for details. Common fixes:"
  echo "  - Backend not running: cd packages/core && cargo run"
  echo "  - Frontend not running: cd packages/ui && npm run dev"
  echo "  - Both at once: docker-compose up --build"
  echo ""
  exit 1
fi