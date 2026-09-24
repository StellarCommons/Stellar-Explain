import { AnalyticsEvent } from '../types.js';

export interface SearchEventOptions {
  query: string;
  resultCount: number;
}

export function createSearchEvent(query: string, resultCount: number): AnalyticsEvent;
export function createSearchEvent(options: SearchEventOptions): AnalyticsEvent;
export function createSearchEvent(
  queryOrOptions: string | SearchEventOptions,
  resultCountParam?: number
): AnalyticsEvent {
  let queryLength = 0;
  let resultCount = 0;

  if (typeof queryOrOptions === 'string') {
    queryLength = queryOrOptions.length;
    resultCount = resultCountParam ?? 0;
  } else {
    queryLength = (queryOrOptions.query || '').length;
    resultCount = queryOrOptions.resultCount ?? 0;
  }

  return {
    name: 'search',
    timestamp: Date.now(),
    properties: {
      queryLength,
      resultCount,
    },
  };
}
