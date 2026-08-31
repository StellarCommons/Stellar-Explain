/**
 * Core Web Vitals tracking using the web-vitals library.
 *
 * Automatically captures LCP, INP (replacing FID), CLS, TTFB, and FCP, then
 * forwards them as `web_vital` analytics events.
 */

import { onLCP, onINP, onCLS, onTTFB, onFCP, Metric } from "web-vitals";

export interface WebVitalProperties {
  /** The web-vitals metric name, e.g. "LCP", "INP", "CLS", "TTFB", "FCP". */
  metric: string;
  /** The metric value in appropriate units (ms for LCP/TTFB/FCP/INP, unitless ratio for CLS). */
  value: number;
  /** Rating: "good", "needs-improvement", or "poor". */
  rating: string;
  /** Navigation type, e.g. "navigate", "reload", "back-forward". */
  navigationType?: string;
  [key: string]: unknown;
}

export interface WebVitalEvent {
  id: string;
  name: "web_vital";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: WebVitalProperties;
}

/**
 * Builds a `web_vital` event from a web-vitals Metric object.
 */
export function buildWebVitalEvent(metric: Metric): WebVitalEvent {
  return {
    id: crypto.randomUUID(),
    name: "web_vital",
    timestamp: new Date(),
    properties: {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType,
    },
  };
}

export type VitalTrackCallback = (event: WebVitalEvent) => void;

/**
 * Registers web-vitals listeners and invokes the callback for each metric
 * report. Returns a cleanup function that sets a flag to stop further reports.
 *
 * Note: web-vitals v4 does not return an unsubscribe function from on*(),
 * so cleanup uses a boolean guard to suppress subsequent reports.
 *
 * @param callback - Called with a `WebVitalEvent` for each metric report.
 * @returns A cleanup function to suppress further reports.
 */
export function startVitalsTracking(callback: VitalTrackCallback): () => void {
  let stopped = false;

  const guard = (event: WebVitalEvent): void => {
    if (!stopped) callback(event);
  };

  onLCP((m) => guard(buildWebVitalEvent(m)));
  onINP((m) => guard(buildWebVitalEvent(m)));
  onCLS((m) => guard(buildWebVitalEvent(m)));
  onTTFB((m) => guard(buildWebVitalEvent(m)));
  onFCP((m) => guard(buildWebVitalEvent(m)));

  return () => {
    stopped = true;
  };
}
