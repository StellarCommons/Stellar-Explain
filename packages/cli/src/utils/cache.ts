import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getCacheDir } from '../config/env.js';

const IN_MEMORY_CACHE = new Map<string, { data: unknown; expiry: number }>();

let diskCacheAvailable = true;

function ensureCacheDir(): void {
  if (!diskCacheAvailable) return;
  const dir = getCacheDir();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    diskCacheAvailable = false;
    console.warn('Warning: Could not create cache directory, using in-memory cache');
  }
}

function cacheFilename(key: string): string {
  return `${crypto.createHash('sha256').update(key).digest('hex')}.json`;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

export function createScopedCacheKey(kind: 'tx' | 'account', identifier: string, baseUrl: string): string {
  const baseHash = crypto
    .createHash('sha256')
    .update(normalizeBaseUrl(baseUrl))
    .digest('hex')
    .slice(0, 12);
  return `${kind}:${baseHash}:${identifier}`;
}

export function cacheGet<T>(key: string): T | null {
  const memResult = IN_MEMORY_CACHE.get(key);
  if (memResult && memResult.expiry > Date.now()) {
    return memResult.data as T;
  }
  IN_MEMORY_CACHE.delete(key);

  if (!diskCacheAvailable) return null;

  const cachePath = path.join(getCacheDir(), cacheFilename(key));
  try {
    if (fs.existsSync(cachePath)) {
      const raw = fs.readFileSync(cachePath, 'utf-8');
      const entry = JSON.parse(raw) as { data: T; expiry: number };
      if (entry.expiry > Date.now()) {
        IN_MEMORY_CACHE.set(key, entry);
        return entry.data;
      }
      fs.unlinkSync(cachePath);
    }
  } catch {
    // ignore read errors
  }
  return null;
}

export function cacheSet(key: string, data: unknown, ttlMs: number): void {
  const entry = { data, expiry: Date.now() + ttlMs };
  IN_MEMORY_CACHE.set(key, entry);

  ensureCacheDir();
  if (!diskCacheAvailable) return;

  const cachePath = path.join(getCacheDir(), cacheFilename(key));
  try {
    fs.writeFileSync(cachePath, JSON.stringify(entry), 'utf-8');
  } catch {
    // ignore write errors
  }
}
