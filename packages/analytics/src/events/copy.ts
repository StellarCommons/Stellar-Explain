import { CopyEvent } from "../../types";

export interface BuildCopyOptions {
  /** Truncated or anonymised preview of what was copied (no PII). */
  preview?: string;
  /** Page path where the copy action happened. */
  path?: string;
}

/**
 * Builds a `button_click` event recorded when a user copies a hash, address,
 * or URL.
 *
 * @param field - What was copied, e.g. "tx_hash", "account_address", "url".
 * @param options - Optional preview/path metadata for the copy event.
 */
export function buildCopyEvent(field: string, options: BuildCopyOptions = {}): CopyEvent {
  return {
    id: crypto.randomUUID(),
    name: "button_click",
    timestamp: new Date(),
    properties: {
      field,
      ...(options.preview !== undefined ? { preview: options.preview } : {}),
      ...(options.path !== undefined ? { path: options.path } : {}),
    },
  };
}