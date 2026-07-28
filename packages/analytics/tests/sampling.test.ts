import { describe, it, expect, vi } from "vitest";

function shouldSample(rate: number): boolean {
  return Math.random() < rate;
}

describe("event sampling", () => {
  it("drops roughly half of events at a 0.5 sample rate", () => {
    const randomValues = [0.1, 0.9, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6];
    let call = 0;
    vi.spyOn(Math, "random").mockImplementation(
      () => randomValues[call++ % randomValues.length],
    );

    const kept = randomValues.map(() => shouldSample(0.5)).filter(Boolean).length;

    expect(kept).toBe(4);
    vi.restoreAllMocks();
  });

  it("keeps all events at a sample rate of 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(shouldSample(1)).toBe(true);
    vi.restoreAllMocks();
  });

  it("drops all events at a sample rate of 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.001);
    expect(shouldSample(0)).toBe(false);
    vi.restoreAllMocks();
  });
});
