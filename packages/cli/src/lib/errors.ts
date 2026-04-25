export class NotFoundError extends Error {
  constructor(msg: string) { super(msg); this.name = "NotFoundError"; }
}

export class NetworkError extends Error {
  constructor(msg: string) { super(msg); this.name = "NetworkError"; }
}

export class InvalidInputError extends Error {
  constructor(msg: string) { super(msg); this.name = "InvalidInputError"; }
}
