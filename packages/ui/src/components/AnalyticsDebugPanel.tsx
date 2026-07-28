"use client";

import { useEffect, useState } from "react";

export interface DebugEvent {
  name: string;
  timestamp: string;
  properties?: Record<string, unknown>;
}

type Listener = (event: DebugEvent) => void;
const listeners: Listener[] = [];

/** Dev-only tap into tracked events, used by the debug panel below. */
export function emitDebugEvent(event: DebugEvent): void {
  for (const listener of listeners) listener(event);
}

function tap(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
  };
}

const MAX_EVENTS = 20;

export default function AnalyticsDebugPanel() {
  const [open, setOpen] = useState(true);
  const [events, setEvents] = useState<DebugEvent[]>([]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    return tap((event) => setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS)));
  }, []);

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.altKey && e.key.toLowerCase() === "a") setOpen((prev) => !prev);
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);

  if (process.env.NODE_ENV !== "development" || !open) return null;

  return (
    <div className="fixed bottom-3 right-3 z-[9999] max-h-[300px] w-80 overflow-y-auto rounded-lg bg-black/85 p-2 font-mono text-[11px] text-green-400">
      <strong>Analytics ({events.length})</strong>
      {events.map((event, i) => (
        <details key={i}>
          <summary>
            {event.name} — {event.timestamp}
          </summary>
          <pre>{JSON.stringify(event.properties, null, 2)}</pre>
        </details>
      ))}
    </div>
  );
}
