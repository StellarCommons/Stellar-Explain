# CLI Usage

Install the CLI globally:

```bash
npm install -g @stellarcommons/stellar-explain
```

## Basic Usage

```bash
# Explain a Stellar account
stellar-explain GABC...XYZ

# Explain a transaction
stellar-explain <tx-hash>

# Output raw JSON
stellar-explain --json GABC...XYZ

# Use a custom API endpoint
stellar-explain --url https://horizon-testnet.stellar.org GABC...XYZ

# Watch an account for changes (polls every 30s)
stellar-explain --watch GABC...XYZ

# Suppress decorative output
stellar-explain --quiet GABC...XYZ
```

## Environment Variables

| Variable | Description |
|---|---|
| `STELLAR_EXPLAIN_TOKEN` | API bearer token |
| `STELLAR_EXPLAIN_URL`   | Base URL override |
| `NO_COLOR`              | Disable color output |
