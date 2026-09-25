import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AnalyticsProvider } from '../../src/react/provider';
import { usePageView } from '../../src/react/usePageView';
import { useAnalytics } from '../../src/react/useAnalytics';

function wrapper({ children }: { children: ReactNode }) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>;
}

describe('usePageView', () => {
  it('fires a page_view event on mount', () => {
    const { result } = renderHook(
      (path: string) => {
        usePageView(path);
        return useAnalytics();
      },
      { wrapper, initialProps: '/home' },
    );

    const queued = result.current.getQueue().drain();
    expect(queued).toHaveLength(1);
    expect(queued[0].name).toBe('page_view');
    expect(queued[0].properties.url).toBe('/home');
  });

  it('fires again when the path changes', () => {
    const { result, rerender } = renderHook(
      (path: string) => {
        usePageView(path);
        return useAnalytics();
      },
      { wrapper, initialProps: '/home' },
    );
    result.current.getQueue().drain();

    rerender('/about');

    const queued = result.current.getQueue().drain();
    expect(queued).toHaveLength(1);
    expect(queued[0].properties.url).toBe('/about');
  });

  it('does not fire again on a re-render with the same path', () => {
    const { result, rerender } = renderHook(
      (path: string) => {
        usePageView(path);
        return useAnalytics();
      },
      { wrapper, initialProps: '/home' },
    );
    result.current.getQueue().drain();

    rerender('/home');

    expect(result.current.getQueue().size).toBe(0);
  });

  it('does not fire after unmount', () => {
    const { result, unmount } = renderHook(
      (path: string) => {
        usePageView(path);
        return useAnalytics();
      },
      { wrapper, initialProps: '/home' },
    );
    result.current.getQueue().drain();

    unmount();

    expect(result.current.getQueue().size).toBe(0);
  });
});
