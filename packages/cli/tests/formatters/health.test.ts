import { describe, it, expect } from "vitest";
import { formatHealth } from "../../src/formatters/health.js";

describe("formatHealth", () => {
  it("renders ok status with reachable horizon", () => {
    const output = formatHealth({ status: "ok", horizon_reachable: true, version: "1.0.0" });
    expect(output).toContain("Status:   ok");
    expect(output).toContain("Horizon:  reachable");
    expect(output).toContain("Version:  1.0.0");
  });

  it("renders degraded status", () => {
    const output = formatHealth({ status: "degraded", horizon_reachable: true, version: "1.0.0" });
    expect(output).toContain("Status:   degraded");
  });

  it("renders down status with unreachable horizon", () => {
    const output = formatHealth({ status: "down", horizon_reachable: false, version: "1.0.0" });
    expect(output).toContain("Status:   down");
    expect(output).toContain("Horizon:  unreachable");
  });

  it("handles horizon unreachable with ok status", () => {
    const output = formatHealth({ status: "ok", horizon_reachable: false, version: "2.0.0" });
    expect(output).toContain("Status:   ok");
    expect(output).toContain("Horizon:  unreachable");
  });
});
