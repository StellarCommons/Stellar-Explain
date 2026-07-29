# @stellar-explain/cli

Query the Stellar Explain backend from your terminal.

## Install

```bash
npm install -g @stellar-explain/cli
```

Or run directly with npx:

```bash
npx @stellar-explain/cli tx <hash>
```

## Usage

```
stellar-explain <command> [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `tx <hash>` | Explain a transaction |
| `account <address>` | Explain an account |
| `health` | Check backend health |
| `batch <file>` | Process a batch of lookups |
| `cache clear` | Clear local response cache |
| `version` | Show CLI and API versions |

### Options

| Option | Description |
|--------|-------------|
| `--url <url>` | Backend URL (default: https://stellar-explain-core.onrender.com) |
| `--no-update-check` | Disable background update check |
| `--help` | Show help |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | API or network error |
| 2 | Invalid input or configuration error |
