export class StellarExplainError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly url?: string
  ) {
    super(message);
    this.name = "StellarExplainError";
  }
}

export class InvalidInputError extends StellarExplainError {
  constructor(hash: string) {
    super(`Invalid transaction hash: "${hash}"`);
    this.name = "InvalidInputError";
  }
}

export interface PaymentExplanation {
  summary: string;
  from: string;
  to: string;
  asset: string;
  amount: string;
}

export interface TransactionExplanation {
  transaction_hash: string;
  successful: boolean;
  summary: string;
  payment_explanations: PaymentExplanation[];
  skipped_operations: number;
}

export interface SdkPlugin {
  name: string;
  beforeRequest?: (
    url: string,
    init: RequestInit
  ) => RequestInit | Promise<RequestInit>;
  afterResponse?: (response: Response) => Response | Promise<Response>;
  onError?: (error: StellarExplainError) => void;
}

export interface CacheAdapter {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl: number): void;
  delete(key: string): void;
  clear(): void;
}

export interface StellarExplainClientConfig {
  baseUrl: string;
  plugins?: SdkPlugin[];
  cache?: CacheAdapter;
}
