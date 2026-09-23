export interface PageContext {
  url: string;
  referrer: string;
  path: string;
  title: string;
}

export function getPageContext(): PageContext {
  if (typeof window === 'undefined') {
    return {
      url: '',
      referrer: '',
      path: '',
      title: '',
    };
  }

  return {
    url: window.location.href,
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    path: window.location.pathname,
    title: typeof document !== 'undefined' ? document.title : '',
  };
}
