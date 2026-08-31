import { describe, it, expect, vi } from "vitest";
import { ConsoleLogger, defaultLogger } from "../src/lib/logger";

describe("ConsoleLogger (issue #98)", () => {
  it("pretty-prints to the matching console method in development", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = new ConsoleLogger({ isProduction: () => false });

    logger.warn("dropped unknown event", { eventName: "bogus" });

    expect(spy).toHaveBeenCalledTimes(1);
    const [line, context] = spy.mock.calls[0];
    expect(line).toMatch(/^\[analytics\] \[warn\] .* dropped unknown event$/);
    expect(context).toEqual({ eventName: "bogus" });
    spy.mockRestore();
  });

  it("omits the context argument entirely when none is given", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const logger = new ConsoleLogger({ isProduction: () => false });

    logger.info("queue flushed");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(1);
    spy.mockRestore();
  });

  it("emits a single JSON line with the {level, message, timestamp, context?} shape in production", () => {
    const lines: string[] = [];
    const logger = new ConsoleLogger({
      isProduction: () => true,
      writeLine: (line) => lines.push(line),
    });

    logger.error("handler error for \"login\"", { error: "boom" });

    expect(lines).toHaveLength(1);
    const record = JSON.parse(lines[0]);
    expect(record).toMatchObject({
      level: "error",
      message: 'handler error for "login"',
      context: { error: "boom" },
    });
    expect(typeof record.timestamp).toBe("string");
    expect(new Date(record.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("drops the context key from the JSON record entirely when none is given", () => {
    const lines: string[] = [];
    const logger = new ConsoleLogger({
      isProduction: () => true,
      writeLine: (line) => lines.push(line),
    });

    logger.debug("tick");

    const record = JSON.parse(lines[0]);
    expect("context" in record).toBe(false);
  });

  it("exports a shared default logger instance usable without configuration", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    expect(() => defaultLogger.debug("hello")).not.toThrow();
    spy.mockRestore();
  });
});
