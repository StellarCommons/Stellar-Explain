import { AnalyticsEvent } from '../types';

export interface SearchEventOptions {
  query: string;
  resultCount: number;
  /**
   * Duration in milliseconds from search-submit to results-rendered.
   * Omitted when the caller doesn't have timing information.
   */
  durationMs?: number;
}

export function createSearchEvent(
  query: string,
  resultCount: number,
  durationMs?: number
): AnalyticsEvent;
export function createSearchEvent(options: SearchEventOptions): AnalyticsEvent;
export function createSearchEvent(
  queryOrOptions: string | SearchEventOptions,
  resultCountParam?: number,
  durationMsParam?: number
): AnalyticsEvent {
  let queryLength = 0;
  let resultCount = 0;
  let durationMs: number | undefined;

  if (typeof queryOrOptions === 'string') {
    queryLength = queryOrOptions.length;
    resultCount = resultCountParam ?? 0;
    durationMs = durationMsParam;
  } else {
    queryLength = (queryOrOptions.query || '').length;
    resultCount = queryOrOptions.resultCount ?? 0;
    durationMs = queryOrOptions.durationMs;
  }

  return {
    name: 'search',
    timestamp: Date.now(),
    properties: {
      queryLength,
      resultCount,
      ...(durationMs !== undefined ? { durationMs } : {}),
    },
  };
}
