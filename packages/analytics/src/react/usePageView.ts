import { useEffect } from 'react';
import { useAnalytics } from './useAnalytics.js';
import { createPageViewEvent, type PageViewOptions } from '../events/page-view.js';

/**
 * Analytics #74 — fires a `page_view` event (#41) on mount and whenever
 * `path` changes, so it can be driven by whatever router the host app uses.
 *
 * @param path - The current route path. Pass the router's pathname; the
 * hook re-fires the event whenever this value changes.
 * @param options - Optional overrides forwarded to `createPageViewEvent`.
 */
export function usePageView(path: string, options?: Omit<PageViewOptions, 'url'>): void {
  const client = useAnalytics();

  useEffect(() => {
    const event = createPageViewEvent({ ...options, url: path });
    client.track(event.name, event.properties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, path]);
}
