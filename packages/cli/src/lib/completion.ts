/**
 * Shell completion helpers for stellar-explain CLI.
 * Generates bash/zsh completion scripts via the `completion` command.
 */

const COMMANDS = ["tx", "account", "health", "batch", "watch", "history", "version", "config"];
const FLAGS = ["--url", "--json", "--help", "--version"];

export type Shell = "bash" | "zsh";

function bashCompletion(bin: string): string {
  const cmds = COMMANDS.join(" ");
  const flags = FLAGS.join(" ");
  return `
_${bin}_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local commands="${cmds}"
  local flags="${flags}"
  if [[ "\${cur}" == -* ]]; then
    COMPREPLY=( $(compgen -W "\${flags}" -- "\${cur}") )
  else
    COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
  fi
}
complete -F _${bin}_completions ${bin}
`.trim();
}

function zshCompletion(bin: string): string {
  const cmds = COMMANDS.map((c) => `'${c}'`).join(" ");
  return `
#compdef ${bin}
_${bin}() {
  local -a commands
  commands=(${cmds})
  _arguments \\
    '--url[API base URL]:url:' \\
    '--json[Output raw JSON]' \\
    '1: :->command'
  case \$state in
    command) _describe 'command' commands ;;
  esac
}
_${bin} "\$@"
`.trim();
}

export function generateCompletion(shell: Shell, bin = "stellar-explain"): string {
  return shell === "bash" ? bashCompletion(bin) : zshCompletion(bin);
}

export function installInstructions(shell: Shell, bin = "stellar-explain"): string {
  if (shell === "bash") {
    return `${bin} completion bash >> ~/.bash_completion && source ~/.bash_completion`;
  }
  return `${bin} completion zsh > "\${fpath[1]}/_${bin}" && exec zsh`;
}
