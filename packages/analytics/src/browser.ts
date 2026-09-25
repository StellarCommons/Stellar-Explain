import { isBrowser } from './env.js';

export interface BrowserInfo { name: string; version: string | null; }

export function getBrowserInfo(userAgent?: string): BrowserInfo {
  const ua = userAgent ?? (isBrowser() ? navigator.userAgent : '');
  if (!ua) return { name: 'unknown', version: null };
  if (/edg\/([\d.]+)/i.test(ua)) return { name: 'Edge', version: RegExp.$1 };
  if (/chrome\/([\d.]+)/i.test(ua)) return { name: 'Chrome', version: RegExp.$1 };
  if (/firefox\/([\d.]+)/i.test(ua)) return { name: 'Firefox', version: RegExp.$1 };
  if (/safari\/([\d.]+)/i.test(ua) && /version\/([\d.]+)/i.test(ua)) return { name: 'Safari', version: RegExp.$1 };
  if (/msie ([\d.]+)/i.test(ua) || /trident.*rv:([\d.]+)/i.test(ua)) return { name: 'IE', version: RegExp.$1 };
  return { name: 'unknown', version: null };
}
