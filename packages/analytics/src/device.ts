import { isBrowser } from './env.js';

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export function getDeviceType(userAgent?: string): DeviceType {
  const ua = userAgent ?? (isBrowser() ? navigator.userAgent : '');
  if (!ua) return 'unknown';
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua)) return 'mobile';
  return 'desktop';
}
