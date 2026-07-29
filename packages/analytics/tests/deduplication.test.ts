import { describe, it, expect } from "vitest";

interface DedupableEvent {
  name: string;
  path?: string;
}

/** Drops events that repeat the same name+path within a single flush window. */
function dedupeWindow(events: DedupableEvent[]): DedupableEvent[] {
  const seen = new Set<string>();
  const result: DedupableEvent[] = [];
  for (const event of events) {
    const key = `${event.name}:${event.path ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }
  return result;
}

describe("event deduplication", () => {
  it("drops duplicate page.viewed events within the same window", () => {
    const events: DedupableEvent[] = [
      { name: "page_view", path: "/tx/abc" },
      { name: "page_view", path: "/tx/abc" },
      { name: "page_view", path: "/tx/abc" },
    ];
    expect(dedupeWindow(events)).toEqual([{ name: "page_view", path: "/tx/abc" }]);
  });

  it("does not affect events with different names or paths", () => {
    const events: DedupableEvent[] = [
      { name: "page_view", path: "/tx/abc" },
      { name: "page_view", path: "/tx/def" },
      { name: "login" },
    ];
    expect(dedupeWindow(events)).toHaveLength(3);
  });
});
