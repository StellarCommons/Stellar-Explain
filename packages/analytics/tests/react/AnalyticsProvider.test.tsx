import { describe, it, expect } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AnalyticsProvider } from '../../src/react/provider';
import { useAnalytics } from '../../src/react/useAnalytics';
import type { Emitter } from '../../src/emitter/index';
import type { AnalyticsEvent } from '../../src/types';

describe('AnalyticsProvider', () => {
  it('provides a working AnalyticsClient by default', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AnalyticsProvider>{children}</AnalyticsProvider>
    );
    const { result } = renderHook(() => useAnalytics(), { wrapper });

    result.current.track('page_view', { path: '/home' });

    expect(result.current.getQueue().size).toBe(1);
  });

  it('renders children', () => {
    render(
      <AnalyticsProvider>
        <span data-testid="child">hello</span>
      </AnalyticsProvider>,
    );

    expect(screen.getByTestId('child').textContent).toBe('hello');
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

    it('disabled wins over globalProperties (#76 + #77)', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider disabled globalProperties={{ app: 'stellar-explain' }}>
          {children}
        </AnalyticsProvider>
      );
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      result.current.track('evt', { local: true });

      expect(result.current.getQueue().size).toBe(0);
    });
  });

  describe('globalProperties prop (#77)', () => {
    it('merges globalProperties into every tracked event', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider globalProperties={{ app: 'stellar-explain', env: 'test' }}>
          {children}
        </AnalyticsProvider>
      );
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      result.current.track('evt', { local: true });

      const queued = result.current.getQueue().drain();
      expect(queued).toHaveLength(1);
      expect(queued[0].properties).toMatchObject({
        app: 'stellar-explain',
        env: 'test',
        local: true,
      });
    });

    it('event-specific properties win on key collisions', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider globalProperties={{ app: 'global', version: '1.0.0' }}>
          {children}
        </AnalyticsProvider>
      );
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      result.current.track('evt', { app: 'local' });

      const queued = result.current.getQueue().drain();
      expect(queued).toHaveLength(1);
      expect(queued[0].properties).toMatchObject({
        app: 'local',
        version: '1.0.0',
      });
    });
  });

  describe('custom config / emitter passthrough', () => {
    it('forwards a custom emitter to the provided client', async () => {
      const received: AnalyticsEvent[] = [];
      const emitter: Emitter = {
        send(event: AnalyticsEvent): void {
          received.push(event);
        },
      };
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider emitter={emitter}>{children}</AnalyticsProvider>
      );
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      expect(result.current.getEmitter()).toBe(emitter);

      result.current.track('custom_sink_event', { ok: true });
      await result.current.flush();

      expect(received).toHaveLength(1);
      expect(received[0].name).toBe('custom_sink_event');
    });
  });

  describe('nested providers (Analytics #121)', () => {
    it('inner provider shadows the outer provider', () => {
      const outerWrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider globalProperties={{ scope: 'outer' }}>{children}</AnalyticsProvider>
      );
      const { result: outer } = renderHook(() => useAnalytics(), {
        wrapper: outerWrapper,
      });

      const nestedWrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider globalProperties={{ scope: 'outer' }}>
          <AnalyticsProvider globalProperties={{ scope: 'inner' }}>
            {children}
          </AnalyticsProvider>
        </AnalyticsProvider>
      );
      const { result: inner } = renderHook(() => useAnalytics(), {
        wrapper: nestedWrapper,
      });

      expect(inner.current).not.toBe(outer.current);

      inner.current.track('nested_event', {});

      const queued = inner.current.getQueue().drain();
      expect(queued).toHaveLength(1);
      expect(queued[0].properties).toMatchObject({ scope: 'inner' });
    });

    it('a disabled inner provider no-ops even inside an enabled outer provider', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider>
          <AnalyticsProvider disabled>{children}</AnalyticsProvider>
        </AnalyticsProvider>
      );
      const { result } = renderHook(() => useAnalytics(), { wrapper });

      result.current.track('evt', {});

      expect(result.current.getQueue().size).toBe(0);
    });
  });

  describe('re-render stability (Analytics #121)', () => {
    it('keeps the same client instance across re-renders with unchanged props', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider>{children}</AnalyticsProvider>
      );
      const { result, rerender } = renderHook(() => useAnalytics(), { wrapper });

      const first = result.current;
      rerender();
      rerender();

      expect(result.current).toBe(first);
    });

    it('creates a new client when disabled toggles', () => {
      let disabled = false;
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider disabled={disabled}>{children}</AnalyticsProvider>
      );
      const { result, rerender } = renderHook(() => useAnalytics(), { wrapper });

      const enabledClient = result.current;
      enabledClient.track('before_toggle', {});
      expect(enabledClient.getQueue().size).toBe(1);

      disabled = true;
      rerender();

      const disabledClient = result.current;
      expect(disabledClient).not.toBe(enabledClient);

      disabledClient.track('after_toggle', {});
      expect(disabledClient.getQueue().size).toBe(0);
    });

    it('creates a new client when globalProperties change', () => {
      let globalProperties: Record<string, unknown> = { v: '1' };
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider globalProperties={globalProperties}>
          {children}
        </AnalyticsProvider>
      );
      const { result, rerender } = renderHook(() => useAnalytics(), { wrapper });

      const first = result.current;

      globalProperties = { v: '2' };
      rerender();

      expect(result.current).not.toBe(first);

      result.current.track('evt', {});
      const queued = result.current.getQueue().drain();
      expect(queued[0].properties).toMatchObject({ v: '2' });
    });

    it('preserves queued events on the same instance across harmless re-renders', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AnalyticsProvider>{children}</AnalyticsProvider>
      );
      const { result, rerender } = renderHook(() => useAnalytics(), { wrapper });

      result.current.track('sticky', {});
      rerender();

      expect(result.current.getQueue().size).toBe(1);
    });
  });
});
