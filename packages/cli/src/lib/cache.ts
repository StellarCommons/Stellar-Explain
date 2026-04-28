import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const CACHE_DIR = path.join(
  process.env["HOME"] ?? process.env["USERPROFILE"] ?? ".",
  ".stellar-explain-cache"
);

function cacheKey(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex");
}

export function getCached<T>(input: string, ttlMs?: number): T | null {
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
}

export function clearCache(): void {
  if (!fs.existsSync(CACHE_DIR)) return;
  for (const entry of fs.readdirSync(CACHE_DIR)) {
    if (entry.endsWith(".json")) {
      fs.unlinkSync(path.join(CACHE_DIR, entry));
    }
  }
}

export function setCache<T>(input: string, data: T): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, cacheKey(input) + ".json");
  fs.writeFileSync(file, JSON.stringify(data), "utf8");
}