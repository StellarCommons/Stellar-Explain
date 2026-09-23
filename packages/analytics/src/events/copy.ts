import { AnalyticsEvent } from '../types';

export function createCopyEvent(copiedTextLength: number): AnalyticsEvent {
  return {
    name: 'copy',
    timestamp: Date.now(),
    properties: {
      copiedTextLength,
      length: copiedTextLength,
    },
  };
}
