import { AnalyticsEvent } from '../types';

export interface ResultViewOptions {
  /** Zero-based index of the result within the results list. */
  index: number;
  /** The kind of result viewed, e.g. "tx", "account", "profile". */
  type: string;
}

export function createResultViewEvent(index: number, type: string): AnalyticsEvent;
export function createResultViewEvent(options: ResultViewOptions): AnalyticsEvent;
export function createResultViewEvent(
  indexOrOptions: number | ResultViewOptions,
  typeParam?: string
): AnalyticsEvent {
  let index: number;
  let type: string;

  if (typeof indexOrOptions === 'number') {
    index = indexOrOptions;
    type = typeParam ?? 'unknown';
  } else {
    index = indexOrOptions.index;
    type = indexOrOptions.type || 'unknown';
  }

  return {
    name: 'result_view',
    timestamp: Date.now(),
    properties: {
      index,
      type,
    },
  };
}
