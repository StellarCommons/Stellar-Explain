export interface TrackedEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: string;
}

type Listener = (event: TrackedEvent) => void;

const listeners: Listener[] = [];

/** Registers a listener for tracked events; returns an unsubscribe function. */
export function onAnalyticsEvent(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
  };
}

function track(name: string, properties?: Record<string, unknown>): void {
  const event: TrackedEvent = { name, properties, timestamp: new Date().toISOString() };
  for (const listener of listeners) listener(event);
}

/** Fires `account.explained` after a successful account explanation response. */
export function accountExplained(address: string, durationMs: number): void {
  track("account.explained", { address, durationMs });
}
