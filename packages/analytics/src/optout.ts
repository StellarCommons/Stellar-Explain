import { isLocalStorageAvailable } from './lib/storageAvailability.js';

const OPT_OUT_KEY = 'stellar_analytics_opt_out';

export class OptOutManager {
  private optedOut: boolean = false;

  constructor() {
    this.optedOut = this.loadState();
  }

  private loadState(): boolean {
    if (isLocalStorageAvailable()) {
      try {
        return localStorage.getItem(OPT_OUT_KEY) === 'true';
      } catch {
        return false;
      }
    }
    return false;
  }

  public isOptedOut(): boolean {
    return this.optedOut;
  }

  public optOut(): void {
    this.optedOut = true;
    if (isLocalStorageAvailable()) {
      try {
        localStorage.setItem(OPT_OUT_KEY, 'true');
      } catch {
        // ignore storage failures; in-memory flag still applies
        // Ignore unavailable storage and retain the current state.
      }
    }
  }

  public optIn(): void {
    this.optedOut = false;
    if (isLocalStorageAvailable()) {
      try {
        localStorage.removeItem(OPT_OUT_KEY);
      } catch {
        // ignore storage failures; in-memory flag still applies
        // Ignore unavailable storage and retain the current state.
      }
    }
  }
}

export const optOutManager = new OptOutManager();
