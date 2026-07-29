import { warnInsecureUrl } from '../config/validate.js';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    warnInsecureUrl(this.baseUrl);
  }

  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        const msg = String(err.message);
        if (msg.includes('ECONNREFUSED')) {
          throw new Error(`Connection refused at ${this.baseUrl}. Is the Stellar Explain backend running?`);
        }
        if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
          throw new Error(`Cannot reach ${this.baseUrl}. Check the URL and your internet connection.`);
        }
      }
      throw err;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const body = (await response.json()) as ApiResponse<T>;
    return body.data;
  }

  async health(): Promise<{ status: string; horizon_reachable: boolean; version: string }> {
    return this.get('/health');
  }

  async explainTx(hash: string): Promise<unknown> {
    return this.get(`/tx/${hash}`);
  }

  async explainAccount(address: string): Promise<unknown> {
    return this.get(`/account/${address}`);
  }
}
