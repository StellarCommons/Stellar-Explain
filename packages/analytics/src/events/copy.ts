import { AnalyticsEvent } from '../types.js';

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
