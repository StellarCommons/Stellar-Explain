# @stellar-explain/cli

CLI tool for the Stellar Explain API.

## Usage

```sh
npx @stellar-explain/cli <command>
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
