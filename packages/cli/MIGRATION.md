# Migrating from curl to the Stellar Explain CLI

This guide shows how to replace raw `curl` calls to the Stellar Explain API with equivalent `stellar-explain` CLI commands.

## Installation

```sh
npx @stellar-explain/cli --version
# or install globally
npm install -g @stellar-explain/cli
```

## Pointing at a custom backend

**curl** — pass the full URL every time:
```sh
curl https://my-instance.example.com/health
```

**CLI** — set once via an environment variable:
```sh
export STELLAR_EXPLAIN_URL=https://my-instance.example.com
stellar-explain health
```

Or pass it per command with `--url`:
```sh
stellar-explain --url https://my-instance.example.com health
```

---

## Health check

**Before (curl):**
```sh
curl https://stellar-explain-core.onrender.com/health
```

**After (CLI):**
```sh
stellar-explain health
```

The CLI formats the response for readability. To get raw JSON (identical to `curl`):
```sh
stellar-explain health --json
```

---

## Explain a transaction

**Before (curl):**
```sh
curl https://stellar-explain-core.onrender.com/tx/b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020
```

**After (CLI):**
```sh
stellar-explain tx b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020
```

Raw JSON output:
```sh
stellar-explain tx <hash> --json
```

---

## Explain an account

**Before (curl):**
```sh
curl https://stellar-explain-core.onrender.com/account/GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN
```

**After (CLI):**
```sh
stellar-explain account GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN
```

Raw JSON output:
```sh
stellar-explain account <address> --json
```

---

## Batch transactions (CLI-only feature)

The CLI can process many hashes at once from a file — no curl loop needed.

**Before (curl + shell loop):**
```sh
while IFS= read -r hash; do
  curl "https://stellar-explain-core.onrender.com/tx/$hash"
done < hashes.txt
```

**After (CLI):**
```sh
stellar-explain batch hashes.txt
```

Save results to a file:
```sh
stellar-explain batch hashes.txt --output results.json
```

Control parallelism (default: 3):
```sh
stellar-explain batch hashes.txt --concurrency 5
```

---

## Watch a transaction until settled (CLI-only feature)

Poll a transaction until it reaches `success` or `failed` — replaces a manual retry loop.

```sh
stellar-explain watch <hash>
```

Customize polling interval and maximum wait time:
```sh
stellar-explain watch <hash> --interval 2000 --watch-timeout 60000
```

---

## Global options

These options work with every command:

| curl equivalent | CLI flag | Description |
|---|---|---|
| `--max-time 5` | `--timeout 5000` | Request timeout (ms) |
| *(manual retry)* | `--retries 3` | Retry on network error |
| `--verbose` | `--verbose` | Log request details to stderr |
| `jq .` | `--json` | Output raw JSON |

---

## Quick reference

| Task | curl | CLI |
|---|---|---|
| Health check | `curl .../health` | `stellar-explain health` |
| Explain tx | `curl .../tx/<hash>` | `stellar-explain tx <hash>` |
| Explain account | `curl .../account/<addr>` | `stellar-explain account <addr>` |
| Batch hashes | shell loop | `stellar-explain batch hashes.txt` |
| Watch tx | manual polling | `stellar-explain watch <hash>` |
