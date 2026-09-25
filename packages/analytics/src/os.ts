import { isBrowser } from './env.js';

export interface OsInfo { name: string; version: string | null; }

export function getOsInfo(userAgent?: string): OsInfo {
  const ua = userAgent ?? (isBrowser() ? navigator.userAgent : '');
  if (!ua) return { name: 'unknown', version: null };
  if (/windows nt (\d+\.\d+)/i.test(ua)) {
    return { name: 'Windows', version: RegExp.$1 };
  }
  if (/mac os x ([\d_]+)/i.test(ua)) {
    return { name: 'macOS', version: RegExp.$1.replace(/_/g, '.') };
  }
  if (/android ([\d.]+)/i.test(ua)) {
    return { name: 'Android', version: RegExp.$1 };
  }
  if (/(iphone|ipad|ipod).*os ([\d_]+)/i.test(ua)) {
    return { name: 'iOS', version: RegExp.$2.replace(/_/g, '.') };
  }
  if (/linux/i.test(ua)) return { name: 'Linux', version: null };
  return { name: 'unknown', version: null };
}
