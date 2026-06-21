# @stellar-explain/cli

CLI tool for the Stellar Explain API.

## Usage

```sh
npx @stellar-explain/cli <command>
```

## Configuration File

You can create a `.stellar-explain.json` file in your project directory (or home directory) to set default options. The CLI will automatically pick it up — no flags required.

**Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | Base URL of the Stellar Explain API (must be `http://` or `https://`) |
| `timeout` | `number` | Request timeout in milliseconds (positive integer) |

**Example `.stellar-explain.json`:**

```json
{
  "url": "http://localhost:3000",
  "timeout": 5000
}
```

**Lookup order:**
1. `--url` / `--timeout` CLI flags (highest priority)
2. `.stellar-explain.json` in the current working directory
3. `.stellar-explain.json` in the home directory (`~/`)
4. Built-in defaults (`https://stellar-explain-core.onrender.com`, 10 000 ms)

You can also manage the config file via the CLI:

```sh
stellar-explain config set url http://localhost:3000
stellar-explain config set timeout 5000
stellar-explain config list
```

## Development

```sh
npm run build
npm run dev
```
