import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AnalyticsProvider } from '../../src/react/provider';
import { useTrackEvent } from '../../src/react/useTrackEvent';
import { useAnalytics } from '../../src/react/useAnalytics';

function wrapper({ children }: { children: ReactNode }) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>;
}

describe('useTrackEvent', () => {
  it('returns a callback that enqueues an event on the shared client', () => {
    const { result } = renderHook(
      () => ({ track: useTrackEvent(), client: useAnalytics() }),
      { wrapper },
    );

    result.current.track('button_click', { id: 'submit' });

    expect(result.current.client.getQueue().size).toBe(1);
  });

  it('returns a stable function reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useTrackEvent(), { wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
