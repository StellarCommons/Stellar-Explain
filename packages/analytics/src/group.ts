import { AnalyticsEvent } from './types';

export interface GroupTraits {
  name?: string;
  plan?: string;
  [key: string]: unknown;
}

export function createGroupEvent(groupId: string, traits?: GroupTraits): AnalyticsEvent {
  return {
    name: 'group',
    timestamp: Date.now(),
    properties: {
      groupId,
      traits: traits || {},
    },
  };
}
