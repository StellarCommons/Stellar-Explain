import { EventEmitter, ConsoleSink } from "@stellar-explain/analytics";
import type { EventName } from "@stellar-explain/analytics";

const emitter = new EventEmitter();
const sink = new ConsoleSink();

emitter.on("search.performed", (event) => sink.send(event));

/** Fires `search.performed` when a user submits a hash or address search. */
export function searchPerformed(inputType: "tx" | "account", query: string): void {
  emitter.track({
    id: crypto.randomUUID(),
    name: "search.performed" as EventName,
    timestamp: new Date(),
    properties: { inputType, query },
  });
}
