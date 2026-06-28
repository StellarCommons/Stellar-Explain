import { statSync } from "fs";
import { join } from "path";

const MAX_SIZE_BYTES = 500 * 1024;
const distFile = join(__dirname, "..", "dist", "index.js");

let stat;
try {
  stat = statSync(distFile);
} catch {
  process.stderr.write("dist/index.js not found. Run npm run build first.
");
  process.exit(1);
}

const sizeKb = (stat.size / 1024).toFixed(1);

if (stat.size > MAX_SIZE_BYTES) {
  process.stderr.write(`Bundle too large: ${sizeKb} KB (max 500 KB)
`);
  process.exit(1);
}

process.stdout.write(`Bundle size OK: ${sizeKb} KB
`);
