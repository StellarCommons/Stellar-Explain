import { describe, it, expect } from "vitest";
import { EXIT_SUCCESS, EXIT_API_ERROR, EXIT_INPUT_ERROR } from "../src/lib/exitCodes.js";
import { NotFoundError, NetworkError, InvalidInputError } from "../src/lib/errors.js";

function resolveExitCode(err: unknown): number {
  if (err instanceof InvalidInputError) return EXIT_INPUT_ERROR;
  if (err instanceof NotFoundError || err instanceof NetworkError) return EXIT_API_ERROR;
  return EXIT_API_ERROR;
}

describe("exit code conventions", () => {
  it("EXIT_SUCCESS is 0", () => {
    expect(EXIT_SUCCESS).toBe(0);
  });

  it("EXIT_API_ERROR is 1", () => {
    expect(EXIT_API_ERROR).toBe(1);
  });

  it("EXIT_INPUT_ERROR is 2", () => {
    expect(EXIT_INPUT_ERROR).toBe(2);
  });

  it("InvalidInputError maps to EXIT_INPUT_ERROR (2)", () => {
    expect(resolveExitCode(new InvalidInputError("bad hash"))).toBe(EXIT_INPUT_ERROR);
  });

  it("NotFoundError maps to EXIT_API_ERROR (1)", () => {
    expect(resolveExitCode(new NotFoundError("tx not found"))).toBe(EXIT_API_ERROR);
  });

  it("NetworkError maps to EXIT_API_ERROR (1)", () => {
    expect(resolveExitCode(new NetworkError("timeout"))).toBe(EXIT_API_ERROR);
  });

  it("unknown error maps to EXIT_API_ERROR (1)", () => {
    expect(resolveExitCode(new Error("unexpected"))).toBe(EXIT_API_ERROR);
  });
});
