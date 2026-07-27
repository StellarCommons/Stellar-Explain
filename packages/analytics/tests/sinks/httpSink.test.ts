import { describe, it, expect, vi } from "vitest";
import { HttpSink } from "../../src/sinks/HttpSink";
import type { FetchImpl } from "../../src/sinks/HttpSink";
import type { AnalyticsEvent } from "../../src/types/events";

const ENDPOINT = "https://analytics.example.com/events";

function makeEvent(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return {
    id: "evt-abc",
    name: "api_call",
    timestamp: new Date("2024-03-10T08:00:00.000Z"),
    userId: "u-1",
    sessionId: "s-1",
    properties: { route: "/tx/abc" },
    ...overrides,
  };
}

/** Returns a mock fetch that resolves with the given status code. */
function mockFetch(status: number, ok = status >= 200 && status < 300): FetchImpl {
  return vi.fn().mockResolvedValue({
    ok,
    status,
  } as Response);
}

describe("HttpSink.send()", () => {
  it("calls fetch with the configured URL", async () => {
    const fetch = mockFetch(200);
    const sink = new HttpSink({ url: ENDPOINT, fetchImpl: fetch });
    await sink.send(makeEvent());

    expect(fetch).toHaveBeenCalledWith(ENDPOINT, expect.anything());
  });

  it("uses POST method", async () => {
    const fetch = mockFetch(200);
    const sink = new HttpSink({ url: ENDPOINT, fetchImpl: fetch });
    await sink.send(makeEvent());

    const init = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
  });

  it("sets Content-Type: application/json header", async () => {
    const fetch = mockFetch(200);
    const sink = new HttpSink({ url: ENDPOINT, fetchImpl: fetch });
    await sink.send(makeEvent());

    const init = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("sets Authorization header when token is provided", async () => {
    const fetch = mockFetch(200);
    const sink = new HttpSink({ url: ENDPOINT, token: "secret-token", fetchImpl: fetch });
    await sink.send(makeEvent());

    const init = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer secret-token",
    );
  });

  it("does NOT set Authorization header when token is absent", async () => {
    const fetch = mockFetch(200);
    const sink = new HttpSink({ url: ENDPOINT, fetchImpl: fetch });
    await sink.send(makeEvent());

    const init = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Authorization"]).toBeUndefined();
  });

  it("merges extra headers into the request", async () => {
    const fetch = mockFetch(200);
    const sink = new HttpSink({
      url: ENDPOINT,
      headers: { "X-Source": "cli" },
      fetchImpl: fetch,
    });
    await sink.send(makeEvent());

    const init = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-Source"]).toBe("cli");
  });

  it("sends the event body as valid JSON", async () => {
    const fetch = mockFetch(200);
    const sink = new HttpSink({ url: ENDPOINT, fetchImpl: fetch });
    const event = makeEvent();
    await sink.send(event);

    const init = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;

    expect(body.id).toBe(event.id);
    expect(body.name).toBe(event.name);
    expect(body.timestamp).toBe(event.timestamp.toISOString());
  });

  it("includes userId and sessionId in body", async () => {
    const fetch = mockFetch(200);
    const sink = new HttpSink({ url: ENDPOINT, fetchImpl: fetch });
    await sink.send(makeEvent({ userId: "user-77", sessionId: "sess-88" }));

    const init = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;

    expect(body.userId).toBe("user-77");
    expect(body.sessionId).toBe("sess-88");
  });

  it("includes properties in body", async () => {
    const fetch = mockFetch(200);
    const sink = new HttpSink({ url: ENDPOINT, fetchImpl: fetch });
    await sink.send(makeEvent({ properties: { plan: "pro" } }));

    const init = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;

    expect(body.properties).toEqual({ plan: "pro" });
  });

  it("resolves without throwing on 200 OK", async () => {
    const sink = new HttpSink({ url: ENDPOINT, fetchImpl: mockFetch(200) });
    await expect(sink.send(makeEvent())).resolves.toBeUndefined();
  });

  it("resolves without throwing on 201 Created", async () => {
    const sink = new HttpSink({ url: ENDPOINT, fetchImpl: mockFetch(201) });
    await expect(sink.send(makeEvent())).resolves.toBeUndefined();
  });

  it("throws on 400 Bad Request", async () => {
    const sink = new HttpSink({ url: ENDPOINT, fetchImpl: mockFetch(400, false) });
    await expect(sink.send(makeEvent())).rejects.toThrow("400");
  });

  it("throws on 401 Unauthorized", async () => {
    const sink = new HttpSink({ url: ENDPOINT, fetchImpl: mockFetch(401, false) });
    await expect(sink.send(makeEvent())).rejects.toThrow("401");
  });

  it("throws on 500 Internal Server Error", async () => {
    const sink = new HttpSink({ url: ENDPOINT, fetchImpl: mockFetch(500, false) });
    await expect(sink.send(makeEvent())).rejects.toThrow("500");
  });

  it("propagates network errors from fetch", async () => {
    const fetch: FetchImpl = vi.fn().mockRejectedValue(new Error("Network failure"));
    const sink = new HttpSink({ url: ENDPOINT, fetchImpl: fetch });
    await expect(sink.send(makeEvent())).rejects.toThrow("Network failure");
  });
});
