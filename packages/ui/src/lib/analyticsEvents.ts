import { EventEmitter, ConsoleSink } from "@stellar-explain/analytics";
import type { EventName } from "@stellar-explain/analytics";

const emitter = new EventEmitter();
const sink = new ConsoleSink();

emitter.on("tx.not_found", (event) => sink.send(event));
emitter.on("account.not_found", (event) => sink.send(event));

/** Fires `tx.not_found` or `account.not_found` when a lookup returns 404. */
export function trackNotFound(kind: "tx" | "account", identifier: string): void {
  const eventName = kind === "tx" ? "tx.not_found" : "account.not_found";
  emitter.track({
    id: crypto.randomUUID(),
    name: eventName as EventName,
    timestamp: new Date(),
    properties: { identifier },
  });
}
