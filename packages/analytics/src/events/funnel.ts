import { AnalyticsEvent } from '../types';

export interface FunnelStepOptions {
  /** Name identifying the funnel, e.g. "onboarding", "checkout". */
  funnel: string;
  /** Zero-based index of the step within the funnel. */
  step: number;
  /** Optional human-readable label for the step. */
  stepName?: string;
}

export function createFunnelStepEvent(funnel: string, step: number, stepName?: string): AnalyticsEvent;
export function createFunnelStepEvent(options: FunnelStepOptions): AnalyticsEvent;
export function createFunnelStepEvent(
  funnelOrOptions: string | FunnelStepOptions,
  stepParam?: number,
  stepNameParam?: string
): AnalyticsEvent {
  let funnel: string;
  let step: number;
  let stepName: string | undefined;

  if (typeof funnelOrOptions === 'string') {
    funnel = funnelOrOptions;
    step = stepParam ?? 0;
    stepName = stepNameParam;
  } else {
    funnel = funnelOrOptions.funnel;
    step = funnelOrOptions.step;
    stepName = funnelOrOptions.stepName;
  }

  return {
    name: 'funnel_step',
    timestamp: Date.now(),
    properties: {
      funnel,
      step,
      ...(stepName !== undefined ? { stepName } : {}),
    },
  };
}
