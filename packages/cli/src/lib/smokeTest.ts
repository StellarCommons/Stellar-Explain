import { execSync } from "child_process";

const BINARY = "node dist/index.js";
const BASE_URL = process.env.STELLAR_EXPLAIN_URL ?? "http://localhost:3000";

interface SmokeResult {
  command: string;
  passed: boolean;
  output: string;
}

function run(cmd: string): SmokeResult {
  try {
    const output = execSync(`${BINARY} ${cmd} --url ${BASE_URL}`, {
      encoding: "utf8",
      timeout: 10_000,
    }).trim();
    return { command: cmd, passed: true, output };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { command: cmd, passed: false, output: msg };
  }
}

function printResult(result: SmokeResult): void {
  const icon = result.passed ? "✓" : "✗";
  console.log(`${icon}  ${result.command}`);
  if (!result.passed) console.error(`   ${result.output}`);
}

export function runSmokeTests(): void {
  const cases = ["--version", "health"];
  const results = cases.map(run);

  results.forEach(printResult);

  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error(`\n${failed.length} smoke test(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll smoke tests passed.");
}

if (require.main === module) {
  runSmokeTests();
}
