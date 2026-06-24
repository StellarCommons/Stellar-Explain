# Using the Stellar Explain CLI in CI Pipelines

This guide shows how to integrate `@stellar-explain/cli` into a GitHub Actions workflow to verify Stellar transactions after a deploy.

## Use case

After deploying an application that submits Stellar transactions, you can run the CLI in CI to confirm those transactions are readable and explained correctly by the Stellar Explain backend.

## Example workflow

```yaml
# .github/workflows/verify-tx.yml
name: Verify Stellar Transaction

on:
  workflow_dispatch:
    inputs:
      tx_hash:
        description: "Transaction hash to verify"
        required: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Verify transaction explanation
        run: |
          npx @stellar-explain/cli tx ${{ github.event.inputs.tx_hash }} --json
        env:
          STELLAR_EXPLAIN_URL: https://stellar-explain-core.onrender.com
```

## Post-deploy verification

To automatically verify a known transaction hash after each deploy, hardcode the hash or pass it as an output from a prior job:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    outputs:
      tx_hash: ${{ steps.submit.outputs.tx_hash }}
    steps:
      - name: Deploy and capture tx hash
        id: submit
        run: |
          HASH=$(your-deploy-script --output tx-hash)
          echo "tx_hash=$HASH" >> "$GITHUB_OUTPUT"

  verify:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Check transaction is explainable
        run: |
          npx @stellar-explain/cli tx ${{ needs.deploy.outputs.tx_hash }} --json
        env:
          STELLAR_EXPLAIN_URL: https://stellar-explain-core.onrender.com
```

## Health check before querying

Add a health check step to fail fast if the backend is unreachable:

```yaml
      - name: Check backend health
        run: npx @stellar-explain/cli health
        env:
          STELLAR_EXPLAIN_URL: https://stellar-explain-core.onrender.com

      - name: Verify transaction
        run: npx @stellar-explain/cli tx <hash> --json
        env:
          STELLAR_EXPLAIN_URL: https://stellar-explain-core.onrender.com
```

## Notes

- `--json` outputs machine-readable JSON, suitable for piping to `jq` or downstream steps.
- Set `STELLAR_EXPLAIN_URL` as a repository secret or environment variable to avoid hardcoding.
- The CLI exits with a non-zero code on error, so CI will fail automatically if the transaction cannot be explained.
- Use `--retries 3` to tolerate transient network issues in CI environments.
