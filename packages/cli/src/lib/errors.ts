export class NotFoundError extends Error {
  constructor(msg: string) { super(msg); this.name = "NotFoundError"; }
}

export class NetworkError extends Error {
  constructor(msg: string) { super(msg); this.name = "NetworkError"; }
}

export class InvalidInputError extends Error {
  constructor(msg: string) { super(msg); this.name = "InvalidInputError"; }
}

export class NonJsonResponseError extends Error {
  constructor(status: number, preview: string) {
    super(`HTTP ${status}: non-JSON response — ${preview}`);
    this.name = "NonJsonResponseError";
  }
}
