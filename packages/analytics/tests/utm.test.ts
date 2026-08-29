import { describe, it, expect } from "vitest";
import { parseUtmParams } from "../src/utm";

describe("parseUtmParams", () => {
  it("parses all UTM parameters when present", () => {
    const url =
      "https://example.com/page?utm_source=google&utm_medium=cpc&utm_campaign=launch&utm_term=stellar&utm_content=ad1";
    expect(parseUtmParams(url)).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "launch",
      utm_term: "stellar",
      utm_content: "ad1",
    });
  });

  it("returns only present params when some are missing", () => {
    const url = "https://example.com/?utm_source=email&utm_campaign=newsletter";
    expect(parseUtmParams(url)).toEqual({
      utm_source: "email",
      utm_campaign: "newsletter",
    });
  });

  it("returns empty object when no UTM params are present", () => {
    expect(parseUtmParams("https://example.com/page")).toEqual({});
  });

  it("returns empty object for a malformed URL", () => {
    expect(parseUtmParams("not a url")).toEqual({});
  });
});
