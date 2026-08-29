export interface QRShareProperties {
  /** What the QR code represents, e.g. "address", "tx", "url". */
  type: string;
}

export interface QRShareEvent {
  id: string;
  name: "qr_share";
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  properties: QRShareProperties;
}

/**
 * Builds a `qr_share` event recorded when a user opens the QR share modal.
 *
 * @param type - The kind of resource being shared via QR code.
 */
export function buildQRShareEvent(type: string): QRShareEvent {
  return {
    id: crypto.randomUUID(),
    name: "qr_share",
    timestamp: new Date(),
    properties: { type },
  };
}