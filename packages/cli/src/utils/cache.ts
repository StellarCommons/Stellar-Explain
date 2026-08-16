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

export function cacheGet<T>(key: string): T | null {
  const memResult = IN_MEMORY_CACHE.get(key);
  if (memResult && memResult.expiry > Date.now()) {
    return memResult.data as T;
  }
  IN_MEMORY_CACHE.delete(key);

  if (!diskCacheAvailable) return null;

  const cachePath = path.join(getCacheDir(), `${sanitizeKey(key)}.json`);
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

  const cachePath = path.join(getCacheDir(), `${sanitizeKey(key)}.json`);
  try {
    fs.writeFileSync(cachePath, JSON.stringify(entry), 'utf-8');
  } catch {
    // ignore write errors
  }
}

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_');
}
