export function shouldSample(sampleRate: number): boolean {
  if (sampleRate >= 1) return true;
  if (sampleRate <= 0) return false;
  return Math.random() < sampleRate;
}
