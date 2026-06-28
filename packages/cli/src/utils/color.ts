export interface ColorOptions {
  noColor?: boolean;
  stdout?: Pick<NodeJS.WriteStream, "isTTY">;
  env?: NodeJS.ProcessEnv;
}

export function shouldUseColorOutput(options: ColorOptions = {}): boolean {
  const stdout = options.stdout ?? process.stdout;
  const env = options.env ?? process.env;

  return options.noColor !== true && env.NO_COLOR === undefined && Boolean(stdout.isTTY);
}

export function colorize(text: string, code: number, enabled: boolean): string {
  return enabled ? `\u001b[${code}m${text}\u001b[0m` : text;
}
