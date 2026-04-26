export async function withConcurrency<T>(
  items: string[],
  limit: number,
  fn: (item: string) => Promise<T>
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const chunk = await Promise.all(batch.map(fn));
    results.push(...chunk);
  }
  return results;
}