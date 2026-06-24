import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readConfigFile } from "../src/lib/configFile.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readConfigFile", () => {
  it("reads updateCheck from the local config file", () => {
    const dir = mkdtempSync(join(tmpdir(), "stellar-explain-"));
    writeFileSync(
      join(dir, ".stellar-explain.json"),
      JSON.stringify({ url: "https://example.com", timeout: 4500, updateCheck: false }),
      "utf8",
    );

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(dir);

    expect(readConfigFile()).toEqual({
      url: "https://example.com",
      timeout: 4500,
      updateCheck: false,
    });

    cwdSpy.mockRestore();
    rmSync(dir, { recursive: true, force: true });
  });
});
