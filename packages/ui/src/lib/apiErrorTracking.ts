import { EventEmitter, ConsoleSink } from "@stellar-explain/analytics";
import type { EventName } from "@stellar-explain/analytics";

const emitter = new EventEmitter();
const sink = new ConsoleSink();

emitter.on("error.api", (event) => sink.send(event));

/** Fires `error.api` for upstream failures worth alerting on (5xx, 429). */
export function apiError(endpoint: string, statusCode: number): void {
  emitter.track({
    id: crypto.randomUUID(),
    name: "error.api" as EventName,
    timestamp: new Date(),
    properties: { endpoint, statusCode },
  });
}

/** True for status codes that should be tracked as `error.api` (not 404s). */
export function isTrackableApiError(statusCode: number): boolean {
  return statusCode >= 500 || statusCode === 429;
}
