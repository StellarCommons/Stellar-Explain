import chalk from "chalk";
import type { HealthResponse } from "../types/index.js";

const STATUS_COLOR: Record<HealthResponse["status"], chalk.Chalk> = {
  ok: chalk.green,
  degraded: chalk.yellow,
  down: chalk.red,
};

export function formatHealth(h: HealthResponse): string {
  const color = STATUS_COLOR[h.status];
  return [
    `${chalk.bold("Status:")} ${color(h.status)}`,
    `${chalk.bold("Horizon:")} ${h.horizon_reachable ? chalk.green("reachable") : chalk.red("unreachable")}`,
    `${chalk.bold("Version:")} ${h.version}`,
  ].join("\n");
}
