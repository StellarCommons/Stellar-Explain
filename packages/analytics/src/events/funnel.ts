export interface FunnelStepProperties {
  /** The name of the conversion funnel. */
  funnelName: string;
  /** The numeric step index within the funnel (0-based). */
  step: number;
  /** The human-readable name of the funnel step. */
  stepName: string;
  /** Optional page path where the step occurred. */
  path?: string;
  [key: string]: unknown;
}

export interface FunnelStepEvent {
  id: string;
  name: "funnel_step";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: FunnelStepProperties;
}

/**
 * Builds a `funnel_step` event recording progression through a conversion funnel.
 *
 * @param funnelName - The name of the conversion funnel.
 * @param step       - The numeric step index (0-based).
 * @param stepName   - The human-readable name of the step.
 * @param path       - Optional page path where the step occurred.
 */
export function buildFunnelStepEvent(
  funnelName: string,
  step: number,
  stepName: string,
  path?: string,
): FunnelStepEvent {
  return {
    id: crypto.randomUUID(),
    name: "funnel_step",
    timestamp: new Date(),
    properties: {
      funnelName,
      step,
      stepName,
      ...(path !== undefined ? { path } : {}),
    },
  };
}
