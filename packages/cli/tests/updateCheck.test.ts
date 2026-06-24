import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";

const httpsGetMock = vi.hoisted(() => vi.fn());
vi.mock("https", () => ({
  get: httpsGetMock,
}));

import { runUpdateCheck } from "../src/lib/updateCheck.js";

afterEach(() => {
  httpsGetMock.mockReset();
  vi.restoreAllMocks();
});

function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe("runUpdateCheck", () => {
  it("prints a notice when a newer version is available", async () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const socket = { unref: vi.fn() };

    httpsGetMock.mockImplementation(((...args: any[]) => {
      const callback = args[1] as (res: EventEmitter) => void;
      const request = new EventEmitter();
      const response = new EventEmitter();

      callback(response);

      queueMicrotask(() => {
        request.emit("socket", socket);
        response.emit("data", JSON.stringify({ version: "9.9.9" }));
        response.emit("end");
      });

      return request as any;
    }) as any);

    runUpdateCheck("1.0.0");
    await waitForNextTick();

    expect(socket.unref).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining("Notice: A newer version of @stellar-explain/cli is available (9.9.9)."),
    );
  });

  it("silently ignores registry errors", async () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    httpsGetMock.mockImplementation(((...args: any[]) => {
      const request = new EventEmitter();
      queueMicrotask(() => {
        request.emit("error", new Error("registry unavailable"));
      });
      return request as any;
    }) as any);

    runUpdateCheck("1.0.0");
    await waitForNextTick();

    expect(writeSpy).not.toHaveBeenCalled();
  });
});
