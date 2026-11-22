#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${SMOKE_PORT:-18080}"

node -e "require('node:http').createServer((_,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({status:'ok',horizon_reachable:true,version:'smoke'}));}).listen(${PORT},'127.0.0.1');" &
SERVER_PID=$!
cleanup() { kill "$SERVER_PID" >/dev/null 2>&1 || true; }
trap cleanup EXIT

# wait for mock server
for i in {1..50}; do
  if node -e "fetch('http://127.0.0.1:${PORT}/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

node bin/stellar-explain --help >/dev/null
node bin/stellar-explain --version >/dev/null
node bin/stellar-explain health --url "http://127.0.0.1:${PORT}" >/dev/null

echo "CLI smoke checks passed"
