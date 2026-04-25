/** Base class for all Stellar Explain CLI errors. */
export class StellarExplainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a network request fails or the API is unreachable. */
export class NetworkError extends StellarExplainError {
  constructor(message: string) {
    super(message);
  }
}

/** Thrown when the requested resource does not exist (HTTP 404). */
export class NotFoundError extends StellarExplainError {
  constructor(message: string) {
    super(message);
  }
}

/** Thrown when user-supplied input fails validation. */
export class InvalidInputError extends StellarExplainError {
  readonly field: string;

  constructor(field: string, message: string) {
    super(`[${field}] ${message}`);
    this.field = field;
  }
}

export function isStellarExplainError(err: unknown): err is StellarExplainError {
  return err instanceof StellarExplainError;
}

export function formatError(err: unknown): string {
  if (err instanceof InvalidInputError) return `Invalid input — ${err.message}`;
  if (err instanceof NotFoundError) return `Not found — ${err.message}`;
  if (err instanceof NetworkError) return `Network error — ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}
