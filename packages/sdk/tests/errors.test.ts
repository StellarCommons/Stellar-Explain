import { describe, it, expect } from "vitest";
import {
  StellarExplainError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  UpstreamError,
  InvalidInputError,
} from "../src/errors/index.js";

const errorClasses = [
  NotFoundError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  UpstreamError,
  InvalidInputError,
] as const;

describe("error class hierarchy", () => {
  it.each(errorClasses)("%s is instanceof its own class", (Cls) => {
    expect(new Cls()).toBeInstanceOf(Cls);
  });

  it.each(errorClasses)("%s is instanceof StellarExplainError", (Cls) => {
    expect(new Cls()).toBeInstanceOf(StellarExplainError);
  });

  it.each(errorClasses)("%s is instanceof Error", (Cls) => {
    expect(new Cls()).toBeInstanceOf(Error);
  });

  it.each(errorClasses)("%s preserves message", (Cls) => {
    expect(new Cls("test message").message).toBe("test message");
  });

  it("NotFoundError has statusCode 404", () => {
    expect(new NotFoundError().statusCode).toBe(404);
  });

  it("RateLimitError stores retryAfter when provided", () => {
    expect(new RateLimitError("msg", 30).retryAfter).toBe(30);
  });

  it("RateLimitError has retryAfter undefined when not provided", () => {
    expect(new RateLimitError().retryAfter).toBeUndefined();
  });

  it("TimeoutError has code TIMEOUT", () => {
    expect(new TimeoutError().code).toBe("TIMEOUT");
  });

  it("NotFoundError has name NotFoundError", () => {
    expect(new NotFoundError().name).toBe("NotFoundError");
  });

  it("RateLimitError has name RateLimitError", () => {
    expect(new RateLimitError().name).toBe("RateLimitError");
  });

  it("TimeoutError has name TimeoutError", () => {
    expect(new TimeoutError().name).toBe("TimeoutError");
  });

  it("NetworkError has name NetworkError", () => {
    expect(new NetworkError().name).toBe("NetworkError");
  });

  it("UpstreamError has name UpstreamError", () => {
    expect(new UpstreamError().name).toBe("UpstreamError");
  });

  it("InvalidInputError has name InvalidInputError", () => {
    expect(new InvalidInputError().name).toBe("InvalidInputError");
  });
});
