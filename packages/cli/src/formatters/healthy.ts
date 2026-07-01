import type { HealthResponse } from "../types/index.js";
import { colorize } from "../lib/config.js";

const STATUS_COLOR: Record<HealthResponse["status"], number> = {
  ok: 32,
  degraded: 33,
  down: 31,
};

export function formatHealth(h: HealthResponse, useColor = false): string {
  return [
    `Status:   ${colorize(h.status, STATUS_COLOR[h.status], useColor)}`,
    `Horizon:  ${colorize(h.horizon_reachable ? "reachable" : "unreachable", h.horizon_reachable ? 32 : 31, useColor)}`,
    `Version:  ${h.version}`,
  ].join("\n");
}
