import { AnalyticsEvent } from '../types.js';

export type ScrollThreshold = 25 | 50 | 75 | 100;

export function createScrollDepthEvent(depth: ScrollThreshold | number): AnalyticsEvent {
  return {
    name: 'scroll_depth',
    timestamp: Date.now(),
    properties: {
      depth,
      threshold: depth,
    },
  };
}
