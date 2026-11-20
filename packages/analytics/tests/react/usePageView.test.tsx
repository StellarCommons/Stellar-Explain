import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AnalyticsProvider } from '../../src/react/provider.js';
import { usePageView } from '../../src/react/usePageView.js';
import { useAnalytics } from '../../src/react/useAnalytics.js';
import type { PageViewOptions } from '../../src/events/page-view.js';

function defaultWrapper({ children }: { children: ReactNode }) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>;
}

describe('usePageView (#79, #120)', () => {
  describe('error branch', () => {
    it('throws a clear error when used outside an AnalyticsProvider', () => {
      const { result } = renderHook(() => usePageView('/home'));

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe(
        'useAnalytics() must be used within an <AnalyticsProvider>.',
      );
    });
  });

  describe('mount branch', () => {
    it('fires a page_view event on mount with the given path', () => {
      const { result } = renderHook(
        (path: string) => {
          usePageView(path);
          return useAnalytics();
        },
        { wrapper: defaultWrapper, initialProps: '/home' },
      );

      const queued = result.current.getQueue().drain();
      expect(queued).toHaveLength(1);
      expect(queued[0].name).toBe('page_view');
      expect(queued[0].properties.url).toBe('/home');
    });

    it('fires a page_view event with custom options forwarded to createPageViewEvent', () => {
      const { result } = renderHook(
        ({ path, options }: { path: string; options?: Omit<PageViewOptions, 'url'> }) => {
          usePageView(path, options);
          return useAnalytics();
        },
        {
          wrapper: defaultWrapper,
          initialProps: {
            path: '/tx/0x123',
            options: { title: 'Transaction 0x123', referrer: 'https://stellar.org' },
          },
        },
      );

      const queued = result.current.getQueue().drain();
      expect(queued).toHaveLength(1);
      expect(queued[0].name).toBe('page_view');
      expect(queued[0].properties.url).toBe('/tx/0x123');
      expect(queued[0].properties.title).toBe('Transaction 0x123');
      expect(queued[0].properties.referrer).toBe('https://stellar.org');
    });

    it('does not enqueue events when provider is disabled', () => {
      const disabledWrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider disabled>{children}</AnalyticsProvider>
      );

      const { result } = renderHook(
        (path: string) => {
          usePageView(path);
          return useAnalytics();
        },
        { wrapper: disabledWrapper, initialProps: '/dashboard' },
      );

      expect(result.current.getQueue().size).toBe(0);
    });

    it('attaches globalProperties to the page_view event when configured', () => {
      const globalWrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider globalProperties={{ app: 'stellar-explain', stage: 'production' }}>
          {children}
        </AnalyticsProvider>
      );

      const { result } = renderHook(
        (path: string) => {
          usePageView(path);
          return useAnalytics();
        },
        { wrapper: globalWrapper, initialProps: '/account/GXYZ' },
      );

      const queued = result.current.getQueue().drain();
      expect(queued).toHaveLength(1);
      expect(queued[0].properties).toMatchObject({
        url: '/account/GXYZ',
        app: 'stellar-explain',
        stage: 'production',
      });
    });
  });

  describe('route update and rerender branches', () => {
    it('fires again when the path changes', () => {
      const { result, rerender } = renderHook(
        (path: string) => {
          usePageView(path);
          return useAnalytics();
        },
        { wrapper: defaultWrapper, initialProps: '/home' },
      );
      result.current.getQueue().drain();

      rerender('/about');

      const queued = result.current.getQueue().drain();
      expect(queued).toHaveLength(1);
      expect(queued[0].properties.url).toBe('/about');
    });

    it('fires across multiple consecutive route transitions', () => {
      const { result, rerender } = renderHook(
        (path: string) => {
          usePageView(path);
          return useAnalytics();
        },
        { wrapper: defaultWrapper, initialProps: '/page-1' },
      );
      result.current.getQueue().drain();

      rerender('/page-2');
      rerender('/page-3');

      const queued = result.current.getQueue().drain();
      expect(queued).toHaveLength(2);
      expect(queued[0].properties.url).toBe('/page-2');
      expect(queued[1].properties.url).toBe('/page-3');
    });

    it('does not fire again on a re-render with the same path', () => {
      const { result, rerender } = renderHook(
        (path: string) => {
          usePageView(path);
          return useAnalytics();
        },
        { wrapper: defaultWrapper, initialProps: '/home' },
      );
      result.current.getQueue().drain();

      rerender('/home');

      expect(result.current.getQueue().size).toBe(0);
    });
  });

  describe('unmount branch', () => {
    it('does not fire after unmount', () => {
      const { result, unmount } = renderHook(
        (path: string) => {
          usePageView(path);
          return useAnalytics();
        },
        { wrapper: defaultWrapper, initialProps: '/home' },
      );
      result.current.getQueue().drain();

      unmount();

      expect(result.current.getQueue().size).toBe(0);
    });

    it('handles unmount cleanly without throwing errors', () => {
      const { unmount } = renderHook(() => usePageView('/contact'), {
        wrapper: defaultWrapper,
      });

      expect(() => unmount()).not.toThrow();
    });
  });
});
