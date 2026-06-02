/**
 * Spawns the TypeScript compiler in watch mode for CLI development.
 * Issue #333 — Add a build:watch script for CLI development.
 */

import { spawn, ChildProcess } from "child_process";
import path from "path";

interface WatchOptions {
  cwd?: string;
  silent?: boolean;
}

export function startWatcher(opts: WatchOptions = {}): ChildProcess {
  const cwd = opts.cwd ?? path.resolve(__dirname, "..");
  const tsc = process.platform === "win32" ? "tsc.cmd" : "tsc";

  const child = spawn(tsc, ["--watch", "--preserveWatchOutput"], {
    cwd,
    stdio: opts.silent ? "ignore" : "inherit",
    shell: false,
  });

  child.on("error", (err) => {
    console.error("Failed to start tsc watcher:", err.message);
    process.exit(1);
  });

  child.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`tsc exited with code ${code}`);
    }
  });

  return child;
}

export function stopWatcher(child: ChildProcess): void {
  if (!child.killed) child.kill("SIGTERM");
}

if (require.main === module) {
  const watcher = startWatcher();
  process.on("SIGINT", () => {
    stopWatcher(watcher);
    process.exit(0);
  });
}
