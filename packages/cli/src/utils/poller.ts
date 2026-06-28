export interface PollOptions {
  intervalSeconds: number;
  minInterval: number;
  maxInterval: number;
}

export function validateInterval(seconds: number, opts: PollOptions): void {
  if (seconds < opts.minInterval) {
    throw new Error(`--interval must be at least ${opts.minInterval} seconds`);
  }
  if (seconds > opts.maxInterval) {
    throw new Error(`--interval must be at most ${opts.maxInterval} seconds`);
  }
}

export function createPoller(
  fn: () => Promise<void>,
  intervalSeconds: number
): { stop: () => void } {
  let running = true;
  const tick = async () => {
    while (running) {
      await fn();
      await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
    }
  };
  tick();
  return { stop: () => { running = false; } };
}
