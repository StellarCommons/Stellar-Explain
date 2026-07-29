#!/usr/bin/env bash
set -euo pipefail

# Process a batch of lookups from a JSON file
# Usage: ./batch.sh <batch-file>
#
# Batch file format (JSON array):
# [
#   {"type": "tx", "identifier": "b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020"},
#   {"type": "account", "identifier": "GA4SX4J5H7J4KJQ2J3X4Z5M6N7P8Q9R0ASDFGHJKL"}
# ]

FILE="${1:?Usage: $0 <batch-file>}"

stellar-explain batch "$FILE"
