import { statSync } from "fs";
import { resolve } from "path";

const MAX_SIZE_BYTES = 500 * 1024; // 500 KB
const DIST_FILE = resolve(__dirname, "../dist/index.js");

function formatKB(bytes: number): string {
  return (bytes / 1024).toFixed(1) + " KB";
}

function checkBinarySize(): void {
  let stats;
  try {
    stats = statSync(DIST_FILE);
  } catch {
    console.error(`[check-size] File not found: ${DIST_FILE}`);
    console.error("[check-size] Run 'npm run build' first.");
    process.exit(1);
  }

  const { size } = stats;
  const passed = size <= MAX_SIZE_BYTES;

  console.log(`[check-size] dist/index.js — ${formatKB(size)}`);
  console.log(`[check-size] Limit         — ${formatKB(MAX_SIZE_BYTES)}`);

  if (!passed) {
    console.error(
      `[check-size] FAIL: binary exceeds limit by ${formatKB(size - MAX_SIZE_BYTES)}`
    );
    process.exit(1);
  }

  console.log("[check-size] PASS: binary is within the size limit.");
}

checkBinarySize();
