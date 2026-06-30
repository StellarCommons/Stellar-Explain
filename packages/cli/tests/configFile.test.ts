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

  it("returns empty object when no config file exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "stellar-explain-"));
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(dir);

    expect(readConfigFile()).toEqual({});

    cwdSpy.mockRestore();
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns empty object for malformed JSON config", () => {
    const dir = mkdtempSync(join(tmpdir(), "stellar-explain-"));
    writeFileSync(join(dir, ".stellar-explain.json"), "not valid json", "utf8");
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(dir);

    expect(readConfigFile()).toEqual({});

    cwdSpy.mockRestore();
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns empty object for empty config file", () => {
    const dir = mkdtempSync(join(tmpdir(), "stellar-explain-"));
    writeFileSync(join(dir, ".stellar-explain.json"), "", "utf8");
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(dir);

    expect(readConfigFile()).toEqual({});

    cwdSpy.mockRestore();
    rmSync(dir, { recursive: true, force: true });
  });
});
