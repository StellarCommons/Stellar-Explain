// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require("../../package.json") as { version?: string };

export function getCliVersion(): string {
  return pkg.version ?? "0.0.0";
}

