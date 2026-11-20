import { useCallback } from 'react';
import { useAnalytics } from './useAnalytics.js';

/**
 * Analytics #73 — returns a stable `track` callback bound to the current
 * client, so it can be passed as a dependency or an event handler prop
 * without causing unnecessary re-renders.
 */
export function useTrackEvent(): (name: string, properties?: Record<string, unknown>) => void {
  const client = useAnalytics();

  return useCallback(
    (name: string, properties?: Record<string, unknown>) => {
      client.track(name, properties);
    },
    [client],
  );
}
