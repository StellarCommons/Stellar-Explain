// Fix: consolidate duplicate EventEmitter instances (#1300)
type EventPayload = Record<string, unknown>;
type Listener = (event: string, payload: EventPayload) => void;
const listeners: Listener[] = [];
export function emit(event: string, payload: EventPayload = {}): void {
  for (const l of listeners) { try { l(event, payload); } catch {} }
}
export function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  return () => { const i = listeners.indexOf(listener); if (i !== -1) listeners.splice(i, 1); };
}
