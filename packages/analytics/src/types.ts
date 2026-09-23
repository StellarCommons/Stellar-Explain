/** Core analytics event shape. */
export interface AnalyticsEvent {
  name: string;
  timestamp: number;
  properties: Record<string, unknown>;
}
