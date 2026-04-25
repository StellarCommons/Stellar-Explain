export interface CliConfig {
  noColor: boolean;
}

let _config: CliConfig = { noColor: false };

export function setConfig(config: Partial<CliConfig>): void {
  _config = { ..._config, ...config };

  if (_config.noColor) {
    process.env.NO_COLOR = "1";
    process.env.FORCE_COLOR = "0";
  }
}

export function getConfig(): CliConfig {
  return _config;
}
