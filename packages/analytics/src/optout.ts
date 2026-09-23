const OPT_OUT_KEY = 'stellar_analytics_opt_out';

export class OptOutManager {
  private optedOut: boolean = false;

  constructor() {
    this.optedOut = this.loadState();
  }

  private loadState(): boolean {
    if (typeof localStorage !== 'undefined') {
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
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(OPT_OUT_KEY, 'true');
      } catch {}
    }
  }

  public optIn(): void {
    this.optedOut = false;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(OPT_OUT_KEY);
      } catch {}
    }
  }
}

export const optOutManager = new OptOutManager();
