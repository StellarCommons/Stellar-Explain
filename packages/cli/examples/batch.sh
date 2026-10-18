#!/usr/bin/env bash
set -euo pipefail

# Process a batch of lookups from a JSON file
# Usage: ./batch.sh <batch-file>
#
# Batch file format (JSON array):
# [
#   {"type": "tx", "identifier": "b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020"},
#   {"type": "account", "identifier": "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7"}
# ]

FILE="${1:?Usage: $0 <batch-file>}"

stellar-explain batch "$FILE"
