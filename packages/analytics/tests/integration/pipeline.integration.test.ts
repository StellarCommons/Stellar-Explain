import { describe, it, expect } from "vitest";
import { EventEmitter } from "../../src/emitter/EventEmitter";
import { HttpSink } from "../../src/sinks/HttpSink";
import type { AnalyticsEvent } from "../../src/types/events";

/**
 * End-to-end pipeline test (issue #100): tracks an event via the
 * `EventEmitter`, verifies it's accepted by the Rust ingest endpoint, and
 * queries `/analytics/summary` to confirm the endpoint responds correctly
 * afterward.
 *
 * Skipped by default — set `STELLAR_EXPLAIN_INTEGRATION=true` and have
 * `packages/core` running locally on port 4000 (`cargo run`, from
 * `packages/core/`) to run it.
 */
const runIntegration = process.env.STELLAR_EXPLAIN_INTEGRATION === "true";

const BASE_URL = "http://localhost:4000";
const INGEST_URL = `${BASE_URL}/analytics/events`;
const SUMMARY_URL = `${BASE_URL}/analytics/summary`;

describe.skipIf(!runIntegration)("analytics pipeline integration", () => {
  it("tracks an event through the emitter, delivers it via HttpSink, and the ingest endpoint accepts it", async () => {
    const sink = new HttpSink({ url: INGEST_URL });
    const emitter = new EventEmitter();

    let sendError: unknown;
    emitter.on("page_view", async (event) => {
      try {
        await sink.send(event);
      } catch (err) {
        sendError = err;
      }
    });

    const event: AnalyticsEvent = {
      id: `integration-test-${Date.now()}`,
      name: "page_view",
      timestamp: new Date(),
      properties: { path: "/integration-test" },
    };

    emitter.track(event);
    await emitter.flush();

    expect(sendError).toBeUndefined();
    expect(emitter.metrics().sinkErrors).toBe(0);
  });

  it("queries /analytics/summary and gets back a well-formed response", async () => {
    const response = await fetch(SUMMARY_URL);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      from: string;
      to: string;
      events: Array<{ event: string; count: number }>;
      total: number;
    };

    expect(typeof body.from).toBe("string");
    expect(typeof body.to).toBe("string");
    expect(Array.isArray(body.events)).toBe(true);
    expect(typeof body.total).toBe("number");
    expect(body.total).toBe(
      body.events.reduce((sum, entry) => sum + entry.count, 0),
    );

    // NOTE: this deliberately does NOT assert that the event tracked in the
    // previous test shows up in these counts. `query_event_store` in
    // packages/core/src/routes/analytics.rs currently returns fixed seed
    // data ("replace with real persistence when available", per its own
    // doc comment) rather than reading anything the ingest endpoint wrote —
    // there is no store connecting the two yet. Once one exists, this is
    // the place to add that assertion.
  });
});
