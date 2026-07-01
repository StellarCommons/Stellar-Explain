/**
 * Generic text formatter for arbitrary record objects.
 * Used by tests/formatters/text.test.ts and any caller that needs
 * a plain key=value representation of a transaction or account record.
 */

type RecordValue = string | number | boolean | null | undefined;

function truncate(value: string, max = 56): string {
  if (value.length <= max) return value;
  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}

function renderValue(value: RecordValue): string {
  if (value === null || value === undefined) return "(none)";
  const str = String(value);
  // Truncate long strings that look like Stellar addresses
  if (typeof value === "string" && value.length > 56) {
    return truncate(str);
  }
  return str;
}

/**
 * Render a data record as a simple multiline key: value text block.
 *
 * @param data   - Flat record (unknown extra keys are ignored if not string/number/boolean).
 * @param _kind  - Hint about the record type ("transaction" | "account" | string). Reserved
 *                 for future per-type formatting.
 */
export function formatText(
  data: Record<string, unknown>,
  _kind: string,
): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (
      value === null ||
      value === undefined ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      lines.push(`${key}: ${renderValue(value as RecordValue)}`);
    }
  }
  return lines.join("\n");
}
