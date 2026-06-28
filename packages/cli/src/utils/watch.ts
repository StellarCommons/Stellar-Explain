export interface WatchState {
  balance: string;
  txCount: number;
}

export function hasChanged(prev: WatchState, next: WatchState): boolean {
  return prev.balance !== next.balance || prev.txCount !== next.txCount;
}

export async function watchAccount(
  fetchFn: () => Promise<WatchState>,
  onUpdate: (state: WatchState) => void,
  intervalMs = 30_000
): Promise<() => void> {
  let last: WatchState | null = null;
  let active = true;

  const loop = async () => {
    while (active) {
      try {
        const current = await fetchFn();
        if (!last || hasChanged(last, current)) {
          last = current;
          onUpdate(current);
        }
      } catch { /* network errors are non-fatal in watch mode */ }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  };

  loop();
  return () => { active = false; };
}
