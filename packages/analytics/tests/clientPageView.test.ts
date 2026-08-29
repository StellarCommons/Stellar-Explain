import { describe, it, expect, afterEach } from "vitest";
import { AnalyticsClient } from "../src/client";
import { SESSION_ID_STORAGE_KEY } from "../src/session";
import { USER_ID_STORAGE_KEY } from "../src/user";

const originalSessionStorage = (globalThis as { sessionStorage?: unknown }).sessionStorage;
const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;
const originalWindow = (globalThis as { window?: unknown }).window;
const originalDocument = (globalThis as { document?: unknown }).document;

function setSessionStorage(value: unknown): void {
  Object.defineProperty(globalThis, "sessionStorage", { value, configurable: true });
}

function setLocalStorage(value: unknown): void {
  Object.defineProperty(globalThis, "localStorage", { value, configurable: true });
}

function setWindow(value: unknown): void {
  Object.defineProperty(globalThis, "window", { value, configurable: true });
}

function setDocument(value: unknown): void {
  Object.defineProperty(globalThis, "document", { value, configurable: true });
}

function fakeStorage(store: Record<string, string> = {}) {
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
  };
}

function noopWindow(): unknown {
  return { addEventListener: () => {}, removeEventListener: () => {} };
}

afterEach(() => {
  setSessionStorage(originalSessionStorage);
  setLocalStorage(originalLocalStorage);
  setWindow(originalWindow);
  setDocument(originalDocument);
});

describe("AnalyticsClient.trackPageView", () => {
  it("tracks a page_view event for the given path", async () => {
    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackPageView("/tx/abc123");

    await client.flush();
    client.destroy();

    const event = flushed[0] as {
      name?: string;
      properties?: Record<string, unknown>;
    };
    expect(event.name).toBe("page_view");
    expect(event.properties?.path).toBe("/tx/abc123");
  });

  it("attaches the document title when available", async () => {
    setDocument({ title: "Stellar Explain" });

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackPageView("/tx/abc123");

    await client.flush();
    client.destroy();

    expect(
      (flushed[0] as { properties?: Record<string, unknown> }).properties?.title,
    ).toBe("Stellar Explain");
  });

  it("uses the current location pathname when no path is given", async () => {
    setWindow({ ...(noopWindow() as object), location: { pathname: "/accounts/GA5XYZ" } });

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackPageView();

    await client.flush();
    client.destroy();

    expect(
      (flushed[0] as { properties?: Record<string, unknown> }).properties?.path,
    ).toBe("/accounts/GA5XYZ");
  });

  it("defaults to '/' when running outside a browser", async () => {
    setWindow(undefined);

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.trackPageView();

    await client.flush();
    client.destroy();

    expect(
      (flushed[0] as { properties?: Record<string, unknown> }).properties?.path,
    ).toBe("/");
  });
});

describe("AnalyticsClient anonymous identity attachment", () => {
  it("attaches the generated user ID and session ID to every event", async () => {
    const store: Record<string, string> = {};
    setSessionStorage(fakeStorage(store));
    setLocalStorage(fakeStorage(store));

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.track({ id: "1", name: "search", timestamp: new Date(), properties: { query: "abc" } });

    await client.flush();
    client.destroy();

    const event = flushed[0] as { sessionId?: string; userId?: string };
    expect(event.sessionId).toBe(store[SESSION_ID_STORAGE_KEY]);
    expect(event.userId).toBe(store[USER_ID_STORAGE_KEY]);
  });

  it("leaves events unchanged when storage is unavailable", async () => {
    setSessionStorage(undefined);
    setLocalStorage(undefined);

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.track({ id: "1", name: "search", timestamp: new Date(), properties: { query: "abc" } });

    await client.flush();
    client.destroy();

    const event = flushed[0] as { sessionId?: string; userId?: string };
    expect(event.sessionId).toBeUndefined();
    expect(event.userId).toBeUndefined();
  });

  it("prefers an event-provided sessionId over the generated one", async () => {
    const store: Record<string, string> = {};
    setSessionStorage(fakeStorage(store));
    setLocalStorage(fakeStorage(store));

    const flushed: unknown[] = [];
    const client = new AnalyticsClient({ onFlush: (batch) => void flushed.push(...batch) });

    client.track({
      id: "1",
      name: "search",
      timestamp: new Date(),
      sessionId: "event-owned-session",
      properties: { query: "abc" },
    });

    await client.flush();
    client.destroy();

    expect((flushed[0] as { sessionId?: string }).sessionId).toBe("event-owned-session");
  });
});