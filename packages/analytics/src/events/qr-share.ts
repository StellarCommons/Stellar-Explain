import { AnalyticsEvent } from '../types';

export type QRShareAction = 'generated' | 'shared';

export interface QRShareOptions {
  action: QRShareAction;
  /** What the QR code encodes, e.g. "account", "payment_request". */
  context?: string;
}

export function createQRShareEvent(action: QRShareAction, context?: string): AnalyticsEvent;
export function createQRShareEvent(options: QRShareOptions): AnalyticsEvent;
export function createQRShareEvent(
  actionOrOptions: QRShareAction | QRShareOptions,
  contextParam?: string
): AnalyticsEvent {
  let action: QRShareAction;
  let context: string | undefined;

  if (typeof actionOrOptions === 'string') {
    action = actionOrOptions;
    context = contextParam;
  } else {
    action = actionOrOptions.action;
    context = actionOrOptions.context;
  }

  return {
    name: 'qr_share',
    timestamp: Date.now(),
    properties: {
      action,
      ...(context !== undefined ? { context } : {}),
    },
  };
}
