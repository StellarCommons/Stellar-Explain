// Fix: honor --no-update-check flag before the update check fires (#1330)
export async function maybeCheckForUpdates(
  args: string[],
  checkFn: () => Promise<void>
): Promise<void> {
  const skip =
    args.includes('--no-update-check') ||
    process.env.STELLAR_EXPLAIN_NO_UPDATE_CHECK === '1';
  if (skip) return;
  await checkFn();
}
