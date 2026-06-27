import { Command } from 'commander';

const BASH_SCRIPT = `
###-begin-stellar-explain-completion-###
_stellar_explain_completions() {
  local cur prev words cword
  _init_completion || return

  local commands="tx account history completion help"
  local history_subcommands="clear"
  local completion_shells="bash zsh"
  local global_flags="--help --version"

  case "\${prev}" in
    stellar-explain)
      COMPREPLY=( \$(compgen -W "\${commands}" -- "\${cur}") )
      return ;;
    history)
      COMPREPLY=( \$(compgen -W "\${history_subcommands} --limit --kind" -- "\${cur}") )
      return ;;
    completion)
      COMPREPLY=( \$(compgen -W "\${completion_shells}" -- "\${cur}") )
      return ;;
    --kind)
      COMPREPLY=( \$(compgen -W "tx account" -- "\${cur}") )
      return ;;
  esac

  COMPREPLY=( \$(compgen -W "\${commands} \${global_flags}" -- "\${cur}") )
}

complete -F _stellar_explain_completions stellar-explain
###-end-stellar-explain-completion-###
`.trimStart();

const ZSH_SCRIPT = `
###-begin-stellar-explain-completion-###
#compdef stellar-explain

_stellar_explain() {
  local state

  _arguments \\
    '(-h --help)'{-h,--help}'[Show help]' \\
    '(-V --version)'{-V,--version}'[Show version]' \\
    '1: :->command' \\
    '*: :->args'

  case \$state in
    command)
      local commands=(
        'tx:Look up a Stellar transaction'
        'account:Look up a Stellar account'
        'history:Show recent lookups'
        'completion:Print shell completion script'
      )
      _describe 'command' commands
      ;;
    args)
      case \$words[2] in
        history)
          local history_args=(
            'clear:Delete the local history file'
            '--limit:Maximum entries to show'
            '--kind:Filter by type (tx|account)'
          )
          _describe 'history arg' history_args
          ;;
        completion)
          local shells=('bash' 'zsh')
          _describe 'shell' shells
          ;;
      esac
      ;;
  esac
}

_stellar_explain
###-end-stellar-explain-completion-###
`.trimStart();

type Shell = 'bash' | 'zsh';

const SCRIPTS: Record<Shell, string> = {
  bash: BASH_SCRIPT,
  zsh: ZSH_SCRIPT,
};

const INSTALL_HINT: Record<Shell, string> = {
  bash: '# Add to ~/.bashrc:\n#   eval "$(stellar-explain completion bash)"',
  zsh:  '# Add to ~/.zshrc:\n#   eval "$(stellar-explain completion zsh)"',
};

export function registerCompletionCommand(program: Command): void {
  program
    .command('completion <shell>')
    .description('Print shell completion script for bash or zsh')
    .action((shell: string) => {
      const s = shell.toLowerCase() as Shell;
      if (!(s in SCRIPTS)) {
        console.error(`Unsupported shell "${shell}". Supported: bash, zsh`);
        process.exit(1);
      }
      console.log(INSTALL_HINT[s]);
      console.log(SCRIPTS[s]);
    });
}