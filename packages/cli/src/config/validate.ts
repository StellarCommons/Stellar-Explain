export function warnInsecureUrl(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      console.warn('Warning: using insecure HTTP connection to a remote host.');
    }
  } catch {
    // invalid URL, ignore
  }
}
