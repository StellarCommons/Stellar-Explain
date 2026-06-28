import { loadConfig } from "../../src/config/loader";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";

const TMP = join(process.cwd(), ".stellar-explain.test.json");

afterEach(() => { try { unlinkSync(TMP); } catch {} });

describe("config loader", () => {
  it("returns empty config when file is missing", () => {
    const cfg = loadConfig("/nonexistent/path/.cfg.json");
    expect(cfg).toEqual({});
  });

  it("loads a valid config file", () => {
    writeFileSync(TMP, JSON.stringify({ url: "https://example.com", timeout: 5 }));
    const cfg = loadConfig(TMP);
    expect(cfg.url).toBe("https://example.com");
    expect(cfg.timeout).toBe(5);
  });

  it("throws on invalid JSON", () => {
    writeFileSync(TMP, "not valid json");
    expect(() => loadConfig(TMP)).toThrow();
  });

  it("ignores unknown keys", () => {
    writeFileSync(TMP, JSON.stringify({ unknown: true }));
    const cfg = loadConfig(TMP);
    expect((cfg as Record<string, unknown>).unknown).toBeUndefined();
  });
});
