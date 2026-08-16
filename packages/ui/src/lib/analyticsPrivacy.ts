export interface TrackedEvent {
  name: string;
  properties?: Record<string, unknown>;
}

/** True when the browser has Do Not Track enabled. */
export function isDoNotTrackEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.doNotTrack === "1";
}

function defaultSink(event: TrackedEvent): void {
  // eslint-disable-next-line no-console
  console.debug("[analytics]", event);
}

let sink: (event: TrackedEvent) => void = defaultSink;

/** Swaps the active sink — used to route into a real emitter elsewhere. */
export function setAnalyticsSink(next: (event: TrackedEvent) => void): void {
  sink = next;
}

/**
 * Tracks an event, automatically switching to a no-op when Do Not Track is
 * enabled so no analytics sink ever receives the event.
 */
export function track(name: string, properties?: Record<string, unknown>): void {
  if (isDoNotTrackEnabled()) return;
  sink({ name, properties });
}
