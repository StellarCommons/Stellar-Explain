import { execSync, spawn, ChildProcess } from 'child_process';
import * as path from 'path';

export interface WatchOptions {
  cwd?: string;
  silent?: boolean;
  onRebuild?: (durationMs: number) => void;
}

export function startWatchBuild(opts: WatchOptions = {}): ChildProcess {
  const cwd = opts.cwd ?? process.cwd();
  const args = ['--watch', '--preserveWatchOutput'];
  const tsc = spawn('npx', ['tsc', ...args], {
    cwd,
    stdio: opts.silent ? 'ignore' : 'inherit',
    shell: false,
  });
  return tsc;
}

export function isTscAvailable(cwd: string = process.cwd()): boolean {
  try {
    execSync('npx tsc --version', { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function resolveOutDir(tsconfigPath: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cfg = require(path.resolve(tsconfigPath)) as {
    compilerOptions?: { outDir?: string };
  };
  return cfg.compilerOptions?.outDir ?? 'dist';
}

export function buildOnce(cwd: string = process.cwd()): void {
  execSync('npx tsc', { cwd, stdio: 'inherit' });
}

export function watchScriptName(): string {
  return 'build:watch';
}
