import type { AnalyticsEvent } from '../types.js';

export function createPersonalModeEvent(enabled: boolean): AnalyticsEvent {
  return {
    name: 'personal_mode_toggle',
    timestamp: Date.now(),
    properties: {
      enabled,
    },
  };
}
