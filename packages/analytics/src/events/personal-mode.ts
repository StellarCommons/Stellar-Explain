export interface PersonalModeToggleProperties {
  /** Whether personal mode was enabled (`true`) or disabled (`false`). */
  enabled: boolean;
}

export interface PersonalModeToggleEvent {
  id: string;
  name: "personal_mode_toggle";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: PersonalModeToggleProperties;
}

/**
 * Builds a `personal_mode_toggle` event recorded when a user enables or
 * disables personal mode.
 *
 * @param enabled - Whether personal mode was switched on.
 */
export function buildPersonalModeToggleEvent(enabled: boolean): PersonalModeToggleEvent {
  return {
    id: crypto.randomUUID(),
    name: "personal_mode_toggle",
    timestamp: new Date(),
    properties: { enabled },
  };
}