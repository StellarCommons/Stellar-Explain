export function bashCompletion(binaryName: string): string {
  return `# bash completion for ${binaryName}
_${binaryName}_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  COMPREPLY=($(compgen -W "tx account health batch watch config version" -- "$cur"))
}
complete -F _${binaryName}_completions ${binaryName}`;
}

export function zshCompletion(binaryName: string): string {
  return `#compdef ${binaryName}
_${binaryName}() {
  local -a cmds
  cmds=(tx account health batch watch config version)
  _describe "commands" cmds
}
_${binaryName}`;
}