export interface FormSubmitProperties {
  /** The name or identifier of the submitted form. */
  formName: string;
  /** Optional page path where the submission occurred. */
  path?: string;
  [key: string]: unknown;
}

export interface FormSubmitEvent {
  id: string;
  name: "form_submit";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: FormSubmitProperties;
}

/**
 * Builds a `form_submit` event recording a form submission.
 *
 * @param formName - The name or identifier of the submitted form.
 * @param path     - Optional page path where the submission occurred.
 */
export function buildFormSubmitEvent(
  formName: string,
  path?: string,
): FormSubmitEvent {
  return {
    id: crypto.randomUUID(),
    name: "form_submit",
    timestamp: new Date(),
    properties: {
      formName,
      ...(path !== undefined ? { path } : {}),
    },
  };
}
