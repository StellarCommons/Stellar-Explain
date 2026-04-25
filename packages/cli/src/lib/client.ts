import { NetworkError, NotFoundError } from "./errors";

const DEFAULT_BASE_URL = "https://api.stellar-explain.io";

async function request<T>(url: string): Promise<T> {
  let res: Response;

  try {
    res = await fetch(url);
  } catch {
    throw new NetworkError(`Unable to reach ${url}`);
  }

  if (res.status === 404) throw new NotFoundError(`Resource not found: ${url}`);
  if (!res.ok) throw new NetworkError(`HTTP ${res.status} from ${url}`);

  return res.json() as Promise<T>;
}

export function buildUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}${path}`;
}

export async function getHealth(
  base = DEFAULT_BASE_URL
): Promise<{ status: string }> {
  return request(buildUrl(base, "/health"));
}

export async function getTransaction(
  hash: string,
  base = DEFAULT_BASE_URL
): Promise<unknown> {
  return request(buildUrl(base, `/tx/${hash}`));
}

export async function getAccount(
  address: string,
  base = DEFAULT_BASE_URL
): Promise<unknown> {
  return request(buildUrl(base, `/account/${address}`));
}
