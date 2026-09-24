import { AnalyticsEvent } from '../types.js';

export function createFocusEvent(fieldName: string): AnalyticsEvent {
  return {
    name: 'focus',
    timestamp: Date.now(),
    properties: {
      fieldName,
    },
  };
}

export function createBlurEvent(fieldName: string): AnalyticsEvent {
  return {
    name: 'blur',
    timestamp: Date.now(),
    properties: {
      fieldName,
    },
  };
}
