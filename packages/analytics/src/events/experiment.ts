import { AnalyticsEvent } from '../types';

export interface ExperimentAssignmentOptions {
  /** Name of the experiment, e.g. "new_search_ranking". */
  experiment: string;
  /** The variant assigned to this session/user, e.g. "control", "treatment_a". */
  variant: string;
}

export function createExperimentAssignmentEvent(experiment: string, variant: string): AnalyticsEvent;
export function createExperimentAssignmentEvent(options: ExperimentAssignmentOptions): AnalyticsEvent;
export function createExperimentAssignmentEvent(
  experimentOrOptions: string | ExperimentAssignmentOptions,
  variantParam?: string
): AnalyticsEvent {
  let experiment: string;
  let variant: string;

  if (typeof experimentOrOptions === 'string') {
    experiment = experimentOrOptions;
    variant = variantParam ?? 'unknown';
  } else {
    experiment = experimentOrOptions.experiment;
    variant = experimentOrOptions.variant;
  }

  return {
    name: 'experiment_assignment',
    timestamp: Date.now(),
    properties: {
      experiment,
      variant,
    },
  };
}
