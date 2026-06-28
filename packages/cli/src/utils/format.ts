const STROOPS_PER_XLM = 10_000_000;

export function formatXlm(raw: string, decimals = 2): string {
  const num = parseFloat(raw);
  if (isNaN(num)) throw new Error(`Invalid XLM value: ${raw}`);
  return `${num.toFixed(decimals)} XLM`;
}

export function stroopsToXlm(stroops: number): string {
  return formatXlm((stroops / STROOPS_PER_XLM).toFixed(7));
}

export function formatAmount(raw: string): string {
  const num = parseFloat(raw);
  if (isNaN(num)) return raw;
  const trimmed = parseFloat(num.toFixed(2)).toString();
  return trimmed;
}
