import { useContext } from 'react';
import { AnalyticsContext } from './provider.js';
import type { AnalyticsClient } from '../client.js';

/**
 * Analytics #72 — returns the shared `AnalyticsClient` from context.
 *
 * @throws {Error} If used outside an `AnalyticsProvider`.
 */
export function useAnalytics(): AnalyticsClient {
  const client = useContext(AnalyticsContext);

  if (client === null) {
    throw new Error('useAnalytics() must be used within an <AnalyticsProvider>.');
  }

  return client;
}
