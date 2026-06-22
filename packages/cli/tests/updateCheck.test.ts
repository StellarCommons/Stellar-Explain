import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";

const httpsGetMock = vi.hoisted(() => vi.fn());

vi.mock("https", () => ({
  get: httpsGetMock,
}));

import { runUpdateCheck, shouldRunUpdateCheck } from "../src/lib/updateCheck.js";

afterEach(() => {
  httpsGetMock.mockReset();
  vi.restoreAllMocks();
});

function waitForTick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe("shouldRunUpdateCheck", () => {
  it("disables the startup update check when the flag is set", () => {
    expect(shouldRunUpdateCheck(false, true)).toBe(false);
  });

  it("disables the startup update check when the config turns it off", () => {
    expect(shouldRunUpdateCheck(true, false)).toBe(false);
  });

  it("allows the startup update check when both sources allow it", () => {
    expect(shouldRunUpdateCheck(true, true)).toBe(true);
  });
});

describe("runUpdateCheck", () => {
  it("skips the registry request when disabled", async () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    runUpdateCheck("1.0.0", false);
    await waitForTick();

    expect(httpsGetMock).not.toHaveBeenCalled();
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("prints a notice when a newer version is available", async () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    httpsGetMock.mockImplementation(((...args: any[]) => {
      const callback = args[1] as (res: EventEmitter) => void;
      const request = new EventEmitter();
      const response = new EventEmitter();

      callback(response);

      queueMicrotask(() => {
        response.emit("data", JSON.stringify({ version: "9.9.9" }));
        response.emit("end");
      });

      return request as any;
    }) as any);

    runUpdateCheck("1.0.0", true);
    await waitForTick();

    expect(httpsGetMock).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining("Notice: A newer version of @stellar-explain/cli is available (9.9.9)."),
    );
  });
});
