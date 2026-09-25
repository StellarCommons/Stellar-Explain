import { AnalyticsEvent } from '../types';

export interface RetryOptions {
  /** What is being retried, e.g. "fetch_leaderboard", "submit_form". */
  action: string;
  /** Which attempt this is (1 = first retry after the initial failure). */
  attempt: number;
}

export function createRetryEvent(action: string, attempt: number): AnalyticsEvent;
export function createRetryEvent(options: RetryOptions): AnalyticsEvent;
export function createRetryEvent(
  actionOrOptions: string | RetryOptions,
  attemptParam?: number
): AnalyticsEvent {
  let action: string;
  let attempt: number;

  if (typeof actionOrOptions === 'string') {
    action = actionOrOptions;
    attempt = attemptParam ?? 1;
  } else {
    action = actionOrOptions.action;
    attempt = actionOrOptions.attempt;
  }

  return {
    name: 'retry',
    timestamp: Date.now(),
    properties: {
      action,
      attempt,
    },
  };
}
