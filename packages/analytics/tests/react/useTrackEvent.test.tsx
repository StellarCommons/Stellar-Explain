import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AnalyticsProvider } from '../../src/react/provider.js';
import { useTrackEvent } from '../../src/react/useTrackEvent.js';
import { useAnalytics } from '../../src/react/useAnalytics.js';

function defaultWrapper({ children }: { children: ReactNode }) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>;
}

describe('useTrackEvent (#79, #120)', () => {
  describe('error branch', () => {
    it('throws a clear error when used outside an AnalyticsProvider', () => {
      const { result } = renderHook(() => useTrackEvent());

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe(
        'useAnalytics() must be used within an <AnalyticsProvider>.',
      );
    });
  });

  describe('mount and invocation branches', () => {
    it('returns a callback that enqueues an event with properties on the shared client', () => {
      const { result } = renderHook(
        () => ({ track: useTrackEvent(), client: useAnalytics() }),
        { wrapper: defaultWrapper },
      );

      result.current.track('button_click', { id: 'submit-button', section: 'header' });

      const queued = result.current.client.getQueue().drain();
      expect(queued).toHaveLength(1);
      expect(queued[0].name).toBe('button_click');
      expect(queued[0].properties).toEqual({ id: 'submit-button', section: 'header' });
    });

    it('returns a callback that enqueues an event without properties', () => {
      const { result } = renderHook(
        () => ({ track: useTrackEvent(), client: useAnalytics() }),
        { wrapper: defaultWrapper },
      );

      result.current.track('simple_ping');

      const queued = result.current.client.getQueue().drain();
      expect(queued).toHaveLength(1);
      expect(queued[0].name).toBe('simple_ping');
      expect(queued[0].properties).toEqual({});
    });

    it('enqueues multiple events in order when called sequentially', () => {
      const { result } = renderHook(
        () => ({ track: useTrackEvent(), client: useAnalytics() }),
        { wrapper: defaultWrapper },
      );

      result.current.track('step_1', { step: 1 });
      result.current.track('step_2', { step: 2 });
      result.current.track('step_3', { step: 3 });

      const queued = result.current.client.getQueue().drain();
      expect(queued).toHaveLength(3);
      expect(queued.map((e) => e.name)).toEqual(['step_1', 'step_2', 'step_3']);
    });

    it('no-ops when provider has disabled=true', () => {
      const disabledWrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider disabled>{children}</AnalyticsProvider>
      );
      const { result } = renderHook(
        () => ({ track: useTrackEvent(), client: useAnalytics() }),
        { wrapper: disabledWrapper },
      );

      result.current.track('ignored_event', { key: 'val' });
      expect(result.current.client.getQueue().size).toBe(0);
    });

    it('includes globalProperties when provided', () => {
      const globalWrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider globalProperties={{ app: 'stellar-explain', tier: 'enterprise' }}>
          {children}
        </AnalyticsProvider>
      );
      const { result } = renderHook(
        () => ({ track: useTrackEvent(), client: useAnalytics() }),
        { wrapper: globalWrapper },
      );

      result.current.track('action', { specific: 123 });
      const queued = result.current.client.getQueue().drain();
      expect(queued).toHaveLength(1);
      expect(queued[0].properties).toMatchObject({
        app: 'stellar-explain',
        tier: 'enterprise',
        specific: 123,
      });
    });
  });

  describe('stability and client update branches', () => {
    it('returns a stable function reference across re-renders when client is unchanged', () => {
      const { result, rerender } = renderHook(() => useTrackEvent(), {
        wrapper: defaultWrapper,
      });
      const first = result.current;
      rerender();
      expect(result.current).toBe(first);
    });

    it('updates callback reference when the underlying client changes in context', () => {
      let disabled = false;
      const dynamicWrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider disabled={disabled}>{children}</AnalyticsProvider>
      );

      const { result, rerender } = renderHook(() => useTrackEvent(), {
        wrapper: dynamicWrapper,
      });
      const firstCallback = result.current;

      disabled = true;
      rerender();

      expect(result.current).not.toBe(firstCallback);
    });
  });

  describe('unmount branch', () => {
    it('callback can still be safely invoked after unmount', () => {
      const { result, unmount } = renderHook(
        () => ({ track: useTrackEvent(), client: useAnalytics() }),
        { wrapper: defaultWrapper },
      );

      const track = result.current.track;
      const client = result.current.client;

      unmount();

      expect(() => track('post_unmount_event', { active: false })).not.toThrow();
      expect(client.getQueue().size).toBe(1);
    });
  });
});
