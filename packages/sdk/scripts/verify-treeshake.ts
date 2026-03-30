import { rollup, type RollupOptions } from 'rollup';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const EXCLUDED_SYMBOLS = ['RateLimitError', 'AuthError', 'NetworkError'];

function pass(msg: string): void {
  console.log(`  ✅  ${msg}`);
}

function fail(msg: string): void {
  console.error(`  ❌  ${msg}`);
}

function heading(msg: string): void {
  console.log(`\n${'─'.repeat(60)}\n  ${msg}\n${'─'.repeat(60)}`);
}

async function main(): Promise<void> {
  heading('Tree-shaking verification — @stellarcommons/stellar-explain-sdk');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stellar-treeshake-'));
  const entryFile = path.join(tmpDir, 'consumer.ts');

  fs.writeFileSync(
    entryFile,
    `
// Synthetic consumer: only uses StellarExplainClient and explainTransaction.
// Never imports or references any specific error classes.
import { StellarExplainClient, explainTransaction } from '${path.resolve('src/index')}';

async function run() {
  const client = new StellarExplainClient({ apiKey: 'test-key' });
  const result = await explainTransaction(client, 'some-tx-hash');
  console.log(result);
}

run();
`.trim(),
  );

  console.log(`\n  Entry file written to: ${entryFile}`);

  const rollupOptions: RollupOptions = {
    input: entryFile,
    plugins: [
      nodeResolve({ extensions: ['.ts', '.js'] }),
      typescript({
        tsconfig: path.resolve('tsconfig.json'),
        compilerOptions: { declaration: false, declarationMap: false, declarationDir: undefined },
      }),
    ],
    external: [],
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') return;
      if (warning.code === 'UNRESOLVED_IMPORT') return;
      warn(warning);
    },
  };

  console.log('\n  Running Rollup bundle …');
  const bundle = await rollup(rollupOptions);
  const { output } = await bundle.generate({ format: 'esm' });
  await bundle.close();

  const bundledCode = output
    .filter((chunk) => chunk.type === 'chunk')
    .map((chunk) => (chunk as { code: string }).code)
    .join('\n');

    heading('Checking excluded symbols');

  let allPassed = true;

  for (const symbol of EXCLUDED_SYMBOLS) {
    if (bundledCode.includes(symbol)) {
      fail(`"${symbol}" found in bundle — tree-shaking is broken for this export.`);
      allPassed = false;
    } else {
      pass(`"${symbol}" is absent from the bundle.`);
    }
  }

  heading('Checking required symbols are present');
  for (const symbol of ['StellarExplainClient', 'explainTransaction']) {
    if (bundledCode.includes(symbol)) {
      pass(`"${symbol}" is present in the bundle (expected).`);
    } else {
      fail(`"${symbol}" is missing from the bundle — something is wrong with the build.`);
      allPassed = false;
    }
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });

  heading(allPassed ? '🎉  All tree-shaking checks passed.' : '💥  Tree-shaking verification FAILED.');

  if (!allPassed) {
    console.error(`
  ──────────────────────────────────────────────────────────
  REMEDIATION  (see ARCHITECTURE.md for full details)
  ──────────────────────────────────────────────────────────

  Tree-shaking requires ALL of the following to be true:

  1. sideEffects: false  in packages/sdk/package.json
     • Tells bundlers no module has global side-effects.

  2. ESM output only  (format: "esm" in rollup.config.ts)
     • CommonJS bundles cannot be tree-shaken reliably.

  3. No top-level side effects in src/ modules
     • Do not call functions or mutate globals at module scope.
     • Class definitions are fine; registration calls (e.g.
       registering error codes in a global map) are NOT.

  4. Barrel re-exports must be side-effect-free
     • Avoid  export * from '...'  if the re-exported module
       has side effects.

  Run this script again after applying fixes to confirm.
  ──────────────────────────────────────────────────────────
`);
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('\n  Fatal error during tree-shaking verification:\n', err);
  process.exit(1);
});
