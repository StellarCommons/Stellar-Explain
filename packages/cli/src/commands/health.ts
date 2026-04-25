import { getHealth } from "../lib/client";
import { NetworkError } from "../lib/errors";

export interface HealthResult {
  status: "ok" | "degraded" | "down";
  latencyMs: number;
  timestamp: string;
}

/**
 * Pings the Stellar Explain API and returns health status.
 * Throws NetworkError if the API is unreachable.
 */
export async function healthCommand(baseUrl: string): Promise<HealthResult> {
  const start = Date.now();

  try {
    const data = await getHealth(baseUrl);
    const latencyMs = Date.now() - start;

    return {
      status: data.status ?? "ok",
      latencyMs,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof NetworkError) throw err;
    throw new NetworkError(`Health check failed: ${(err as Error).message}`);
  }
}

export function formatHealthOutput(result: HealthResult): string {
  const icon = result.status === "ok" ? "✅" : result.status === "degraded" ? "⚠️" : "❌";
  return [
    `${icon} API status: ${result.status}`,
    `   Latency:   ${result.latencyMs}ms`,
    `   Checked:   ${result.timestamp}`,
  ].join("\n");
}
