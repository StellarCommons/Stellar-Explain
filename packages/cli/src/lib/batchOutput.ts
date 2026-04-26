import * as fs from "fs";

export function writeBatchOutput(results: unknown[], outputPath?: string): void {
  const json = JSON.stringify(results, null, 2);
  if (outputPath) {
    fs.writeFileSync(outputPath, json, "utf8");
  } else {
    process.stdout.write(json + "\n");
  }
}