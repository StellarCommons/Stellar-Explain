import { describe, it, expect, afterEach } from "vitest";
import { AnalyticsClient } from "../src/client";
import { buildPageViewEvent } from "../src/events/page-view";

const originalDocument = (globalThis as { document?: unknown }).document;

function setDocument(value: unknown): void {
  Object.defineProperty(globalThis, "document", { value, configurable: true });
}

afterEach(() => {
  setDocument(originalDocument);
});

describe("page view referrer tracking", () => {
  it("attaches document.referrer to the page view event", () => {
    setDocument({ referrer: "https://explorer.stellar.org/tx/abc" });

    const event = buildPageViewEvent("/home");

    expect(event.properties.referrer).toBe("https://explorer.stellar.org/tx/abc");
  });

  it("strips query parameters from the referrer for privacy", () => {
    setDocument({
      referrer: "https://search.example.com/landing?utm_source=x&fbclid=abc#frag",
    });

    const event = buildPageViewEvent("/home");

    expect(event.properties.referrer).toBe("https://search.example.com/landing");
  });

  it("omits referrer when none is set", () => {
    setDocument({ referrer: "" });

    const event = buildPageViewEvent("/home");

    expect(event.properties.referrer).toBeUndefined();
  });

  it("omits referrer outside a browser environment", () => {
    setDocument(undefined);

    const event = buildPageViewEvent("/home");

    expect(event.properties.referrer).toBeUndefined();
  });
});

describe("AnalyticsClient page view referrer wiring", () => {
  it("attaches a query-stripped referrer via trackPageView", async () => {
    setDocument({ referrer: "https://ref.example.com/?utm_campaign=newsletter" });

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackPageView("/tx/abc");

    await client.flush();
    client.destroy();

    expect((flushed[0] as { properties?: Record<string, unknown> }).properties).toMatchObject({
      path: "/tx/abc",
      referrer: "https://ref.example.com/",
    });
  });
});