import { describe, it, expect } from "vitest";

import {
  InvalidInputError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  UpstreamError,
} from "../src/errors/index.js";

describe("error messages", () => {
  describe("InvalidInputError", () => {
    it("bad hash includes truncated input", () => {
      const err = new InvalidInputError(`Invalid transaction hash: "abc123"`);
      expect(err.message).toMatchSnapshot();
    });

    it("bad address includes truncated input", () => {
      const err = new InvalidInputError(`Invalid account address: "GABC"`);
      expect(err.message).toMatchSnapshot();
    });
  });

  describe("RateLimitError", () => {
    it("without retryAfter", () => {
      const err = new RateLimitError();
      expect(err.message).toMatchSnapshot();
    });

    it("with retryAfter", () => {
      const err = new RateLimitError("Rate limit exceeded", 30);
      expect(err.message).toMatchSnapshot();
    });
  });

  it("NotFoundError", () => {
    expect(new NotFoundError().message).toMatchSnapshot();
  });

  it("NetworkError", () => {
    expect(new NetworkError().message).toMatchSnapshot();
  });

  it("TimeoutError", () => {
    expect(new TimeoutError().message).toMatchSnapshot();
  });

  it("UpstreamError", () => {
    expect(new UpstreamError().message).toMatchSnapshot();
  });
});
