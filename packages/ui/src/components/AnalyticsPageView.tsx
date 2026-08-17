"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { EventEmitter, ConsoleSink } from "@stellar-explain/analytics";
import type { EventName } from "@stellar-explain/analytics";

const emitter = new EventEmitter();
const sink = new ConsoleSink();

emitter.on("page_view", (event) => sink.send(event));

function normalizePath(path: string): string {
  return (path.split("?")[0] ?? path).split("#")[0] ?? path;
}

function pageViewed(path: string): void {
  emitter.track({
    id: crypto.randomUUID(),
    name: "page_view" as EventName,
    timestamp: new Date(),
    properties: { path },
  });
}

/** Fires `page_view` on mount and on every App Router pathname change. */
export default function AnalyticsPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      pageViewed(normalizePath(pathname));
    }
  }, [pathname]);

  return null;
}
