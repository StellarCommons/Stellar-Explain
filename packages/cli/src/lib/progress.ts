export function printProgress(current: number, total: number): void {
  const pct = Math.round((current / total) * 100);
  process.stderr.write(`\rProgress: ${current}/${total} (${pct}%)`);
  if (current === total) process.stderr.write("\n");
}