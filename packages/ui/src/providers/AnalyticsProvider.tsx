// Fix: AnalyticsProvider now forwards events to the analytics package (#1301)
// Previously it only called console.debug, so no events were tracked.

'use client';
import React, { createContext, useContext, useCallback } from 'react';

type TrackFn = (event: string, props?: Record<string, unknown>) => void;
const AnalyticsContext = createContext<TrackFn>(() => {});

export function useAnalytics() {
  return useContext(AnalyticsContext);
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const track = useCallback<TrackFn>((event, props) => {
    try {
      // Forward to analytics package instead of console.debug
      import('@stellar-explain/analytics').then(({ emit }) => emit(event, props));
    } catch { /* ignore */ }
  }, []);

  return (
    <AnalyticsContext.Provider value={track}>
      {children}
    </AnalyticsContext.Provider>
  );
}
