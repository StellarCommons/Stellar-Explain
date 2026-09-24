import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AnalyticsProvider } from '../../src/react/provider';
import { useAnalytics } from '../../src/react/useAnalytics';

describe('AnalyticsProvider', () => {
  it('provides a working AnalyticsClient by default', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AnalyticsProvider>{children}</AnalyticsProvider>
    );
    const { result } = renderHook(() => useAnalytics(), { wrapper });

    result.current.track('page_view', { path: '/home' });

    expect(result.current.getQueue().size).toBe(1);
  });

  describe('disabled prop (#76)', () => {
    it('fully no-ops tracking when disabled', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider disabled>{children}</AnalyticsProvider>
      );
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      result.current.track('page_view', { path: '/home' });

      expect(result.current.getQueue().size).toBe(0);
    });

    it('does not throw on flush() when disabled', async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider disabled>{children}</AnalyticsProvider>
      );
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      await expect(result.current.flush()).resolves.toBeUndefined();
    });
  });
});
