#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

OUTPUT="${1:-$PKG_DIR/man/stellar-explain.1}"
CLI_BIN="${2:-node $PKG_DIR/bin/stellar-explain}"

mkdir -p "$(dirname "$OUTPUT")"

if command -v help2man &>/dev/null; then
  help2man \
    --name "Query the Stellar Explain backend from your terminal" \
    --section 1 \
    --help-option "--help" \
    --version-option "--version" \
    --no-info \
    "$CLI_BIN" > "$OUTPUT"
  echo "Generated man page using help2man: $OUTPUT"
else
  cat > "$OUTPUT" << 'MANEOF'
.TH STELLAR-EXPLAIN 1 "2026-07-29" "@stellar-explain/cli 0.1.0" "User Commands"
.SH NAME
stellar-explain \- Query the Stellar Explain backend from your terminal
.SH SYNOPSIS
.B stellar-explain
[\fI\,--url <url>\/\fR] [\fI\,--no-update-check\/\fR] \fI\,<command>\/\fR [\fI\,<args>\/\fR]
.SH DESCRIPTION
Stellar Explain transforms raw Stellar Horizon data into clear, human-readable
explanations. The CLI lets you query the backend from your terminal.
.SH COMMANDS
.TP
.B tx <hash>
Explain a transaction by its hash.
.TP
.B account <address>
Explain an account by its public address.
.TP
.B health
Check the backend API health.
.TP
.B batch <file>
Process a batch of lookups from a JSON file.
.SH OPTIONS
.TP
.B \-\-url <url>
Backend URL (default: https://stellar-explain-core.onrender.com).
.TP
.B \-\-no-update-check
Disable the background update check.
.TP
.B \-\-help
Display this help and exit.
.TP
.B \-\-version
Output version information and exit.
.SH EXIT CODES
.TP
0
Success.
.TP
1
API or network error.
.TP
2
Invalid input or configuration error.
.SH ENVIRONMENT
.TP
.B NO_UPDATE_CHECK
Set to 1 to disable the background update check.
.TP
.B STELLAR_EXPLAIN_NO_UPDATE_CHECK
Set to 1 to disable the background update check.
.SH CACHE
Response data is cached in ~/.stellar-explain/. The cache TTL is 5 minutes for
both transaction and account lookups.
.SH BUGS
Report bugs at https://github.com/StellarCommons/Stellar-Explain/issues
.SH COPYRIGHT
MIT License. See https://github.com/StellarCommons/Stellar-Explain
MANEOF
  echo "Generated man page using template: $OUTPUT"
fi
