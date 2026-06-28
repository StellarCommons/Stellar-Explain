# @stellar-explain/cli

CLI tool for the Stellar Explain API.

## Usage

```sh
npx @stellar-explain/cli <command>
```

Disable ANSI colors with `--no-color` or by setting the `NO_COLOR` environment variable.

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

## Commands

| Command | Description |
|---------|-------------|
| `tx <hash>` | Explain a transaction |
| `account <address>` | Explain an account |
| `health` | Check API health |
| `batch` | Explain multiple items |
| `watch` | Watch for updates |
| `history` | View command history |
| `version` | Print version |
| `config` | Manage configuration |
| `completion <shell>` | Output shell completion script |

## Shell Completion

Enable tab completion for `stellar-explain` commands in your shell.

### Bash

```sh
stellar-explain completion bash >> ~/.bash_completion
source ~/.bash_completion
```

To persist across sessions, add the `source` line to your `~/.bashrc`:

```sh
echo 'source ~/.bash_completion' >> ~/.bashrc
```

### Zsh

```sh
stellar-explain completion zsh > "${fpath[1]}/_stellar-explain"
exec zsh
```

> Make sure `~/.zfunc` or another directory is in your `$fpath`. If needed:
> ```sh
> mkdir -p ~/.zfunc
> stellar-explain completion zsh > ~/.zfunc/_stellar-explain
> echo 'fpath=(~/.zfunc $fpath)' >> ~/.zshrc
> echo 'autoload -Uz compinit && compinit' >> ~/.zshrc
> exec zsh
> ```

## Development

```sh
npm run build
npm run dev
```
