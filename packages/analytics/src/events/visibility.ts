import { AnalyticsEvent } from '../types.js';

export function createVisibilityChangeEvent(state?: 'visible' | 'hidden'): AnalyticsEvent {
  const isVisible =
    state !== undefined
      ? state === 'visible'
      : typeof document !== 'undefined'
      ? document.visibilityState === 'visible'
      : true;
  return {
    name: 'visibility_change',
    timestamp: Date.now(),
    properties: {
      state: isVisible ? 'visible' : 'hidden',
      isVisible,
    },
  };
}
