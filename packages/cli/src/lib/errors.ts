import { EXIT_CODE } from "./exitCodes.js";

export class NotFoundError extends Error {
  readonly exitCode = EXIT_CODE.ERROR;
  constructor(msg: string) { super(msg); this.name = "NotFoundError"; }
}

export class NetworkError extends Error {
  readonly exitCode = EXIT_CODE.ERROR;
  constructor(msg: string) { super(msg); this.name = "NetworkError"; }
}

export class InvalidInputError extends Error {
  readonly exitCode = EXIT_CODE.INVALID_INPUT;
  constructor(msg: string) { super(msg); this.name = "InvalidInputError"; }
}

export class NonJsonResponseError extends Error {
  readonly exitCode = EXIT_CODE.ERROR;
  constructor(status: number, preview: string) {
    super(`HTTP ${status}: non-JSON response — ${preview}`);
    this.name = "NonJsonResponseError";
  }
}

export class ConnectionRefusedError extends Error {
  readonly exitCode = EXIT_CODE.ERROR;
  constructor(url: string) {
    super(`Connection refused at ${url}. Is the Stellar Explain backend running?`);
    this.name = "ConnectionRefusedError";
  }
}
