import { describe, it, expect, afterEach } from "vitest";
import { getConnectionInfo, getConnectionType } from "../src/network";

const originalNavigator = globalThis.navigator;

function setNavigator(value: unknown): void {
  Object.defineProperty(globalThis, "navigator", {
    value,
    configurable: true,
  });
}

afterEach(() => {
  setNavigator(originalNavigator);
});

describe("getConnectionInfo", () => {
  it("returns undefined when navigator is unavailable (Node/SSR)", () => {
    setNavigator(undefined);
    expect(getConnectionInfo()).toBeUndefined();
  });

  it("returns undefined when navigator.connection is unsupported", () => {
    setNavigator({});
    expect(getConnectionInfo()).toBeUndefined();
  });

  it("reads fields off navigator.connection when available", () => {
    setNavigator({
      connection: { effectiveType: "4g", type: "wifi", downlink: 10, saveData: false },
    });
    expect(getConnectionInfo()).toEqual({
      effectiveType: "4g",
      type: "wifi",
      downlink: 10,
      saveData: false,
    });
  });

  it("falls back to navigator.mozConnection", () => {
    setNavigator({ mozConnection: { effectiveType: "3g" } });
    expect(getConnectionInfo()).toMatchObject({ effectiveType: "3g" });
  });

  it("falls back to navigator.webkitConnection", () => {
    setNavigator({ webkitConnection: { type: "cellular" } });
    expect(getConnectionInfo()).toMatchObject({ type: "cellular" });
  });

  it("prefers navigator.connection over prefixed variants", () => {
    setNavigator({
      connection: { effectiveType: "4g" },
      mozConnection: { effectiveType: "2g" },
    });
    expect(getConnectionInfo()).toMatchObject({ effectiveType: "4g" });
  });
});

describe("getConnectionType", () => {
  it("returns undefined when the API is unsupported", () => {
    setNavigator({});
    expect(getConnectionType()).toBeUndefined();
  });

  it("prefers effectiveType over type", () => {
    setNavigator({ connection: { effectiveType: "4g", type: "wifi" } });
    expect(getConnectionType()).toBe("4g");
  });

  it("falls back to type when effectiveType is missing", () => {
    setNavigator({ connection: { type: "wifi" } });
    expect(getConnectionType()).toBe("wifi");
  });
});
