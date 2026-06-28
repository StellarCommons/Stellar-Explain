import { describe, expect, it } from "vitest";
import { colorize, shouldUseColorOutput } from "../src/utils/color.js";

describe("shouldUseColorOutput", () => {
  it("uses color when stdout is a TTY", () => {
    expect(shouldUseColorOutput({ stdout: { isTTY: true }, env: {} })).toBe(true);
  });

  it("disables color when --no-color is passed", () => {
    expect(shouldUseColorOutput({ noColor: true, stdout: { isTTY: true }, env: {} })).toBe(false);
  });

  it("disables color when NO_COLOR is set", () => {
    expect(shouldUseColorOutput({ stdout: { isTTY: true }, env: { NO_COLOR: "" } })).toBe(false);
    expect(shouldUseColorOutput({ stdout: { isTTY: true }, env: { NO_COLOR: "1" } })).toBe(false);
  });

  it("does not use color when stdout is not a TTY", () => {
    expect(shouldUseColorOutput({ stdout: { isTTY: false }, env: {} })).toBe(false);
  });
});

describe("colorize", () => {
  it("wraps text with ANSI codes when enabled", () => {
    expect(colorize("ok", 32, true)).toBe("\u001b[32mok\u001b[0m");
  });

  it("returns plain text when disabled", () => {
    expect(colorize("ok", 32, false)).toBe("ok");
  });
});
