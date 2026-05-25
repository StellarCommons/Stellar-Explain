import { describe, it, expect } from "vitest";
import { withConcurrency } from "../src/lib/concurrency.js";

describe("withConcurrency", () => {
  it("never exceeds the configured concurrency limit", async () => {
    const limit = 3;
    let active = 0;
    let maxActive = 0;

    const task = async (_item: string) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 10));
      active--;
    };

    await withConcurrency(Array.from({ length: 10 }, (_, i) => `item${i}`), limit, task);

    expect(maxActive).toBeLessThanOrEqual(limit);
  });

  it("processes all items and returns results in order", async () => {
    const items = ["a", "b", "c", "d", "e"];
    const results = await withConcurrency(items, 2, async (item) => item.toUpperCase());
    expect(results).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("returns empty array for empty input", async () => {
    const results = await withConcurrency([], 3, async (item) => item);
    expect(results).toEqual([]);
  });

  it("works when limit exceeds item count", async () => {
    const items = ["x", "y"];
    const results = await withConcurrency(items, 10, async (item) => item);
    expect(results).toEqual(["x", "y"]);
  });
});
