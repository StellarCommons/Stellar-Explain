import { EventEmitter, ConsoleSink } from "@stellar-explain/analytics";
import type { EventName } from "@stellar-explain/analytics";

const emitter = new EventEmitter();
const sink = new ConsoleSink();

emitter.on("account.explained", (event) => sink.send(event));
emitter.on("account.not_found", (event) => sink.send(event));
emitter.on("tx.not_found", (event) => sink.send(event));
emitter.on("error.api", (event) => sink.send(event));
emitter.on("search.performed", (event) => sink.send(event));
emitter.on("page_view", (event) => sink.send(event));
emitter.on("error_occurred", (event) => sink.send(event));

export interface TrackedEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: string;
}

type Listener = (event: TrackedEvent) => void;

const listeners: Listener[] = [];

emitter.on("account.explained", (event) => {
  const tracked: TrackedEvent = {
    name: event.name,
    properties: event.properties,
    timestamp: event.timestamp.toISOString(),
  };
  for (const listener of listeners) listener(tracked);
});

/** Registers a listener for tracked events; returns an unsubscribe function. */
export function onAnalyticsEvent(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
  };
}

/** Fires `account.explained` after a successful account explanation response. */
export function accountExplained(address: string, durationMs: number): void {
  emitter.track({
    id: crypto.randomUUID(),
    name: "account.explained" as EventName,
    timestamp: new Date(),
    properties: { address, durationMs },
  });
}
