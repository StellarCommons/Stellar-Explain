import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AnalyticsProvider } from '../../src/react/provider';
import { useAnalytics } from '../../src/react/useAnalytics';

describe('useAnalytics', () => {
  it('throws a clear error when used outside an AnalyticsProvider', () => {
    const { result } = renderHook(() => useAnalytics());

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe(
      'useAnalytics() must be used within an <AnalyticsProvider>.',
    );
  });

  it('returns the shared client when used inside an AnalyticsProvider', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AnalyticsProvider>{children}</AnalyticsProvider>
    );
    const { result } = renderHook(() => useAnalytics(), { wrapper });

    expect(result.current).toBeDefined();
    expect(typeof result.current.track).toBe('function');
  });
});
