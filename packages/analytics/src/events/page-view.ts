import { AnalyticsEvent } from '../types.js';

export interface PageViewOptions {
  url?: string;
  title?: string;
  referrer?: string;
}

export function createPageViewEvent(options?: PageViewOptions): AnalyticsEvent {
  const url = options?.url ?? (typeof window !== 'undefined' ? window.location.href : '');
  const title = options?.title ?? (typeof document !== 'undefined' ? document.title : '');
  const referrer = options?.referrer ?? (typeof document !== 'undefined' ? document.referrer : '');

  return {
    name: 'page_view',
    timestamp: Date.now(),
    properties: {
      url,
      title,
      referrer,
    },
  };
}
