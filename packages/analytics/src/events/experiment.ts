export interface ExperimentAssignProperties {
  /** The A/B test experiment identifier. */
  experimentId: string;
  /** The variant the user was assigned to. */
  variantId: string;
  [key: string]: unknown;
}

export interface ExperimentAssignEvent {
  id: string;
  name: "experiment_assign";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: ExperimentAssignProperties;
}

/**
 * Builds an `experiment_assign` event recording which A/B test variant a
 * user was assigned to.
 *
 * @param experimentId - The experiment identifier.
 * @param variantId    - The variant the user was assigned to.
 */
export function buildExperimentAssignEvent(
  experimentId: string,
  variantId: string,
): ExperimentAssignEvent {
  return {
    id: crypto.randomUUID(),
    name: "experiment_assign",
    timestamp: new Date(),
    properties: { experimentId, variantId },
  };
}
