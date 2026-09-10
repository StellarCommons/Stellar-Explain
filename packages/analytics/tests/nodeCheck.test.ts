import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  MIN_NODE_VERSION,
  getNodeMajorVersion,
  isSupportedNodeVersion,
  warnIfUnsupportedNodeVersion,
} from "../src/utils/node-check";

describe("Node.js version check (Analytics #125)", () => {
  const originalProcessVersions = process.versions;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Restore process.versions
    Object.defineProperty(process, "versions", {
      value: originalProcessVersions,
      configurable: true,
      writable: true,
    });
  });

  function setNodeVersion(version: string | undefined): void {
    Object.defineProperty(process, "versions", {
      value: version !== undefined ? { ...originalProcessVersions, node: version } : undefined,
      configurable: true,
      writable: true,
    });
  }

  describe("MIN_NODE_VERSION", () => {
    it("is defined as 18", () => {
      expect(MIN_NODE_VERSION).toBe(18);
    });
  });

  describe("getNodeMajorVersion", () => {
    it("extracts major version correctly for typical versions", () => {
      setNodeVersion("18.19.0");
      expect(getNodeMajorVersion()).toBe(18);

      setNodeVersion("20.10.0");
      expect(getNodeMajorVersion()).toBe(20);

      setNodeVersion("22.0.0");
      expect(getNodeMajorVersion()).toBe(22);
    });

    it("handles older versions", () => {
      setNodeVersion("16.14.2");
      expect(getNodeMajorVersion()).toBe(16);

      setNodeVersion("14.21.3");
      expect(getNodeMajorVersion()).toBe(14);
    });

    it("returns null when process.versions is missing or invalid", () => {
      setNodeVersion(undefined);
      expect(getNodeMajorVersion()).toBeNull();
    });
  });

  describe("isSupportedNodeVersion", () => {
    it("returns true for Node v18+", () => {
      setNodeVersion("18.0.0");
      expect(isSupportedNodeVersion()).toBe(true);

      setNodeVersion("20.11.1");
      expect(isSupportedNodeVersion()).toBe(true);
    });

    it("returns false for Node < v18", () => {
      setNodeVersion("16.20.0");
      expect(isSupportedNodeVersion()).toBe(false);

      setNodeVersion("14.0.0");
      expect(isSupportedNodeVersion()).toBe(false);
    });

    it("supports custom minVersion threshold", () => {
      setNodeVersion("18.0.0");
      expect(isSupportedNodeVersion(20)).toBe(false);
      expect(isSupportedNodeVersion(16)).toBe(true);
    });

    it("returns true in non-Node environments", () => {
      setNodeVersion(undefined);
      expect(isSupportedNodeVersion()).toBe(true);
    });
  });

  describe("warnIfUnsupportedNodeVersion", () => {
    it("logs a console.warn warning when running on Node < v18", () => {
      setNodeVersion("16.19.0");
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = warnIfUnsupportedNodeVersion();
      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain("[@stellar-explain/analytics] Node.js version v16.19.0 is not supported");
      expect(warnSpy.mock.calls[0][0]).toContain("minimum required version is v18+");
    });

    it("does not log a warning on supported Node v18+", () => {
      setNodeVersion("20.9.0");
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = warnIfUnsupportedNodeVersion();
      expect(result).toBe(true);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("does not log a warning in non-Node environments", () => {
      setNodeVersion(undefined);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = warnIfUnsupportedNodeVersion();
      expect(result).toBe(true);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
