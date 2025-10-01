# Stellar Explain Core (Rust)

This package contains the backend Rust service for Stellar-Explain.

## Configuration

The backend service supports configuration via environment variables loaded from a `.env` file in the `packages/core` directory.

Create a `.env` file by copying the example:

```bash
cp .env.example .env
```

### Environment Variables

- `PORT`: The port number the REST API server listens on. Defaults to `3000` if not set.
- `HORIZON_URL`: The base URL for the Stellar Horizon API. Defaults to `https://horizon-testnet.stellar.org` if not set.

### Running the Service

Run the backend service with:

```bash
cargo run --bin core
```

The server will bind to `0.0.0.0:<PORT>` and use the configured Horizon URL for API requests.

### Logging

The service uses `env_logger` to log startup information, including the port and Horizon URL in use.
