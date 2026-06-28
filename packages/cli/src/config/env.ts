export interface EnvConfig {
  token?: string;
  url?: string;
  timeout?: number;
  color?: boolean;
}

export function loadEnvConfig(): EnvConfig {
  const config: EnvConfig = {};

  if (process.env.STELLAR_EXPLAIN_TOKEN) {
    config.token = process.env.STELLAR_EXPLAIN_TOKEN;
  }

  if (process.env.STELLAR_EXPLAIN_URL) {
    config.url = process.env.STELLAR_EXPLAIN_URL;
  }

  if (process.env.STELLAR_EXPLAIN_TIMEOUT) {
    const t = parseInt(process.env.STELLAR_EXPLAIN_TIMEOUT, 10);
    if (!isNaN(t) && t > 0) config.timeout = t;
  }

  if (process.env.NO_COLOR) {
    config.color = false;
  }

  return config;
}
