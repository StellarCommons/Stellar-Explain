#!/usr/bin/env bash
set -euo pipefail

MAX_SIZE=500000

SIZE=0
for dir in dist bin; do
  if [ -d "$dir" ]; then
    while IFS= read -r -d '' f; do
      sz=$(stat -c%s "$f" 2>/dev/null || echo 0)
      SIZE=$((SIZE + sz))
    done < <(find "$dir" -type f -print0)
  fi
done

echo "CLI package size: ${SIZE} bytes (limit: ${MAX_SIZE} bytes)"

if [ "$SIZE" -gt "$MAX_SIZE" ]; then
  echo "Error: CLI package exceeds ${MAX_SIZE} byte limit"
  exit 1
fi
