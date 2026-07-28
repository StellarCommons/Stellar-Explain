import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpSink } from "../../src/sinks/HttpSink";
import { AnalyticsEvent } from "../../src/types/events";

const makeEvent = (overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent => ({
  id: "evt-001",
  name: "page_view",
  timestamp: new Date("2024-01-15T12:00:00.000Z"),
  properties: { path: "/home" },
  userId: "user-42",
  sessionId: "session-abc",
  ...overrides,
});

describe("HttpSink", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  it("sends a POST request to the configured URL", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });

    const sink = new HttpSink({ url: "https://api.example.com/events", fetchImpl: mockFetch });
    await sink.send(makeEvent());

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/events");
  });

  it("uses the POST method", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });

    const sink = new HttpSink({ url: "https://api.example.com/events", fetchImpl: mockFetch });
    await sink.send(makeEvent());

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
  });

  it("sets Content-Type: application/json header by default", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });

    const sink = new HttpSink({ url: "https://api.example.com/events", fetchImpl: mockFetch });
    await sink.send(makeEvent());

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("merges custom headers with the default Content-Type header", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });

    const sink = new HttpSink({
      url: "https://api.example.com/events",
      headers: { "X-Api-Key": "secret-key", "X-Custom": "value" },
      fetchImpl: mockFetch,
    });
    await sink.send(makeEvent());

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["X-Api-Key"]).toBe("secret-key");
    expect(headers["X-Custom"]).toBe("value");
  });

  it("custom headers can override the default Content-Type", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });

    const sink = new HttpSink({
      url: "https://api.example.com/events",
      headers: { "Content-Type": "application/x-ndjson" },
      fetchImpl: mockFetch,
    });
    await sink.send(makeEvent());

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/x-ndjson");
  });

  it("sends the event as JSON in the request body", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });

    const event = makeEvent();
    const sink = new HttpSink({ url: "https://api.example.com/events", fetchImpl: mockFetch });
    await sink.send(event);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const parsed = JSON.parse(init.body as string);
    expect(parsed.id).toBe(event.id);
    expect(parsed.name).toBe(event.name);
    expect(parsed.userId).toBe(event.userId);
    expect(parsed.sessionId).toBe(event.sessionId);
    expect(parsed.properties).toEqual(event.properties);
  });

  it("resolves without error when the server returns 200 OK", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });

    const sink = new HttpSink({ url: "https://api.example.com/events", fetchImpl: mockFetch });
    await expect(sink.send(makeEvent())).resolves.toBeUndefined();
  });

  it("resolves without error when the server returns 201 Created", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 201, statusText: "Created" });

    const sink = new HttpSink({ url: "https://api.example.com/events", fetchImpl: mockFetch });
    await expect(sink.send(makeEvent())).resolves.toBeUndefined();
  });

  it("throws an error on a 400 Bad Request response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400, statusText: "Bad Request" });

    const sink = new HttpSink({ url: "https://api.example.com/events", fetchImpl: mockFetch });
    await expect(sink.send(makeEvent())).rejects.toThrow("400");
  });

  it("throws an error on a 401 Unauthorized response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, statusText: "Unauthorized" });

    const sink = new HttpSink({ url: "https://api.example.com/events", fetchImpl: mockFetch });
    await expect(sink.send(makeEvent())).rejects.toThrow("401");
  });

  it("throws an error on a 500 Internal Server Error response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: "Internal Server Error" });

    const sink = new HttpSink({ url: "https://api.example.com/events", fetchImpl: mockFetch });
    await expect(sink.send(makeEvent())).rejects.toThrow("500");
  });

  it("includes the status text in the thrown error message", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" });

    const sink = new HttpSink({ url: "https://api.example.com/events", fetchImpl: mockFetch });
    await expect(sink.send(makeEvent())).rejects.toThrow("Service Unavailable");
  });

  it("re-throws network-level errors (e.g. DNS failure)", async () => {
    mockFetch.mockRejectedValue(new TypeError("fetch failed: network error"));

    const sink = new HttpSink({ url: "https://unreachable.example.com/events", fetchImpl: mockFetch });
    await expect(sink.send(makeEvent())).rejects.toThrow("network error");
  });

  it("sends events with no properties", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });

    const event = makeEvent({ properties: undefined });
    const sink = new HttpSink({ url: "https://api.example.com/events", fetchImpl: mockFetch });
    await expect(sink.send(event)).resolves.toBeUndefined();

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const parsed = JSON.parse(init.body as string);
    expect(parsed.properties).toBeUndefined();
  });
});
