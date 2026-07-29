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

## Configuration

The CLI reads configuration from `.stellar-explain.json` in the current working directory. Supported keys:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `url` | string | `https://stellar-explain-core.onrender.com` | Backend API base URL |
| `noUpdateCheck` | boolean | `false` | Disable background update check |
| `network` | string | `testnet` | Stellar network (`mainnet` or `testnet`) |
| `cacheTtl.tx` | number | `300000` | Cache TTL for transaction lookups (ms) |
| `cacheTtl.account` | number | `60000` | Cache TTL for account lookups (ms) |

Example:

```json
{
  "url": "https://stellar-explain-core.onrender.com",
  "network": "testnet",
  "noUpdateCheck": true,
  "cacheTtl": {
    "tx": 300000,
    "account": 60000
  }
}
```

CLI flags take precedence over config file values, which take precedence over defaults.

## Shell Completions

Generate completion scripts for your shell and source them from your `.bashrc`, `.zshrc`, or fish config.

### bash

```bash
stellar-explain completion bash > ~/.stellar-explain-completion.bash
echo "source ~/.stellar-explain-completion.bash" >> ~/.bashrc
```

### zsh

```bash
stellar-explain completion zsh > "${fpath[1]}/_stellar-explain"
```

### fish

```bash
stellar-explain completion fish > ~/.config/fish/completions/stellar-explain.fish
```

After adding the completion script, restart your shell or source the config file.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | API or network error |
| 2 | Invalid input or configuration error |
