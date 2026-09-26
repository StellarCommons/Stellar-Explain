import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AnalyticsProvider } from '../../src/react/provider.js';
import { useAnalytics } from '../../src/react/useAnalytics.js';

describe('useAnalytics (#78, #120)', () => {
  describe('error branch', () => {
    it('throws a clear error when used outside an AnalyticsProvider', () => {
      const { result } = renderHook(() => useAnalytics());

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe(
        'useAnalytics() must be used within an <AnalyticsProvider>.',
      );
    });
  });

  describe('mount and context branches', () => {
    it('returns the shared client when used inside a default AnalyticsProvider', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider>{children}</AnalyticsProvider>
      );
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      expect(result.current).toBeDefined();
      expect(typeof result.current.track).toBe('function');
      expect(typeof result.current.flush).toBe('function');
      expect(typeof result.current.getQueue).toBe('function');
    });

    it('returns a DisabledAnalyticsClient when provider has disabled=true', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider disabled>{children}</AnalyticsProvider>
      );
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      expect(result.current).toBeDefined();
      result.current.track('noop_event', { foo: 'bar' });
      expect(result.current.getQueue().size).toBe(0);
    });

    it('returns a GlobalPropertiesAnalyticsClient when provider has globalProperties', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider globalProperties={{ app: 'stellar-explain', version: '2.0.0' }}>
          {children}
        </AnalyticsProvider>
      );
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      result.current.track('test_global', { local: true });
      const queued = result.current.getQueue().drain();
      expect(queued).toHaveLength(1);
      expect(queued[0].properties).toMatchObject({
        app: 'stellar-explain',
        version: '2.0.0',
        local: true,
      });
    });

    it('updates client when provider props change', () => {
      let disabled = false;
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider disabled={disabled}>{children}</AnalyticsProvider>
      );

      const { result, rerender } = renderHook(() => useAnalytics(), { wrapper });
      const activeClient = result.current;

      activeClient.track('event_1');
      expect(activeClient.getQueue().size).toBe(1);

      disabled = true;
      rerender();

      const disabledClient = result.current;
      expect(disabledClient).not.toBe(activeClient);

      disabledClient.track('event_2');
      expect(disabledClient.getQueue().size).toBe(0);
    });
  });

  describe('unmount branch', () => {
    it('unmounts cleanly without throwing errors', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider>{children}</AnalyticsProvider>
      );
      const { result, unmount } = renderHook(() => useAnalytics(), { wrapper });

      expect(result.current).toBeDefined();
      expect(() => unmount()).not.toThrow();
    });
  });
});
