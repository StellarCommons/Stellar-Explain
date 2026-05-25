/**
 * Troubleshooting reference — issue #346
 * Common CLI problems and their fixes.
 */

export interface TroubleshootingEntry {
  symptom: string;
  cause: string;
  fix: string;
}

export const KNOWN_ISSUES: TroubleshootingEntry[] = [
  {
    symptom: "Permission denied when running stellar-explain",
    cause: "Binary is not executable after npm install",
    fix: "Run: chmod +x $(which stellar-explain)",
  },
  {
    symptom: "Error: STELLAR_EXPLAIN_URL is not set",
    cause: "The CLI cannot find the API base URL",
    fix: "Export the variable: export STELLAR_EXPLAIN_URL=http://localhost:3000",
  },
  {
    symptom: "CORS error in browser / fetch blocked",
    cause: "CORS is a browser concern; the CLI uses Node's http stack",
    fix: "CORS does not apply to the CLI. Check that the server is reachable with: curl $STELLAR_EXPLAIN_URL/health",
  },
  {
    symptom: "SyntaxError or 'require is not defined'",
    cause: "Node version is too old (< 18)",
    fix: "Upgrade Node: nvm install 18 && nvm use 18",
  },
  {
    symptom: "stellar-explain: command not found",
    cause: "Global npm bin directory is not in PATH",
    fix: "Add npm bin to PATH: export PATH=$(npm bin -g):$PATH",
  },
];

export function findIssue(keyword: string): TroubleshootingEntry | undefined {
  const kw = keyword.toLowerCase();
  return KNOWN_ISSUES.find(
    (e) =>
      e.symptom.toLowerCase().includes(kw) ||
      e.cause.toLowerCase().includes(kw)
  );
}

export function printAll(): void {
  KNOWN_ISSUES.forEach(({ symptom, cause, fix }, i) => {
    console.log(`\n[${i + 1}] ${symptom}`);
    console.log(`    Cause: ${cause}`);
    console.log(`    Fix:   ${fix}`);
  });
}
