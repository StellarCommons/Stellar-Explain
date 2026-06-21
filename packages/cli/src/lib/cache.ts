import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const CACHE_DIR = path.join(
  process.env["HOME"] ?? process.env["USERPROFILE"] ?? ".",
  ".stellar-explain",
  "cache"
);

function cacheKey(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex");
}

function warnCacheSkipped(action: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    `[warn] Could not ${action} cache directory ${CACHE_DIR}: ${message}; skipping cache\n`
  );
}

export function getCached<T>(input: string, ttlMs?: number): T | null {
  try {
    const file = path.join(CACHE_DIR, cacheKey(input) + ".json");
    if (!fs.existsSync(file)) return null;

    if (ttlMs !== undefined) {
      const { mtimeMs } = fs.statSync(file);
      if (Date.now() - mtimeMs > ttlMs) {
        fs.unlinkSync(file);
        return null;
      }
    }

    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch (error) {
    warnCacheSkipped("read from", error);
    return null;
  }
}

export function clearCache(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) return;
    for (const entry of fs.readdirSync(CACHE_DIR)) {
      if (entry.endsWith(".json")) {
        fs.unlinkSync(path.join(CACHE_DIR, entry));
      }
    }
  } catch (error) {
    warnCacheSkipped("clear", error);
  }
}

export function setCache<T>(input: string, data: T): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const file = path.join(CACHE_DIR, cacheKey(input) + ".json");
    fs.writeFileSync(file, JSON.stringify(data), "utf8");
  } catch (error) {
    warnCacheSkipped("write to", error);
  }
}
