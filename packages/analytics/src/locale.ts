export interface LocaleInfo {
  language: string;
  languages: readonly string[];
  timeZone: string;
}

export function getLocaleInfo(): LocaleInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      language: 'en-US',
      languages: ['en-US'],
      timeZone: 'UTC',
    };
  }

  let timeZone = 'UTC';
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {}

  return {
    language: navigator.language || 'en-US',
    languages: navigator.languages ? [...navigator.languages] : [navigator.language || 'en-US'],
    timeZone,
  };
}
