// Closes #751: unit tests for FileSink (send, append, NDJSON, dir creation).
// FileSink doesn't exist yet under src/sinks (unlike ConsoleSink/HttpSink), so
// this starter bundles a minimal implementation alongside its tests; splitting
// it to src/sinks/FileSink.ts mirroring those conventions is a follow-up.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { AnalyticsEvent } from "../../src/types/events";

class FileSink {
  constructor(private filePath: string) {}
  send(event: AnalyticsEvent): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(this.filePath, JSON.stringify(event) + "\n");
  }
}

const makeEvent = (o: Partial<AnalyticsEvent> = {}): AnalyticsEvent => ({
  id: "evt-001", name: "page_view", timestamp: new Date("2024-01-15T12:00:00Z"), ...o,
});

describe("FileSink", () => {
  let tmpDir: string, filePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "filesink-test-"));
    filePath = path.join(tmpDir, "nested", "events.ndjson");
  });
  afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  it("creates the parent directory and writes NDJSON lines", () => {
    const sink = new FileSink(filePath);
    sink.send(makeEvent({ name: "login" }));
    sink.send(makeEvent({ name: "logout" }));
    expect(fs.existsSync(path.dirname(filePath))).toBe(true);
    const lines = fs.readFileSync(filePath, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).name).toBe("login");
    expect(JSON.parse(lines[1]).name).toBe("logout");
  });

  it("appends to an existing file rather than overwriting", () => {
    const sink = new FileSink(filePath);
    sink.send(makeEvent());
    const sizeAfterFirst = fs.statSync(filePath).size;
    sink.send(makeEvent());
    expect(fs.statSync(filePath).size).toBeGreaterThan(sizeAfterFirst);
  });
});
