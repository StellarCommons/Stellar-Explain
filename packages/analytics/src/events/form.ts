import { AnalyticsEvent } from '../types';

export interface FormSubmissionOptions {
  formId?: string;
  formName?: string;
  fieldCount: number;
}

export function createFormSubmissionEvent(options: FormSubmissionOptions): AnalyticsEvent {
  return {
    name: 'form_submission',
    timestamp: Date.now(),
    properties: {
      formId: options.formId,
      formName: options.formName,
      fieldCount: options.fieldCount,
    },
  };
}
