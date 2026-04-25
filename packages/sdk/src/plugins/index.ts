import type { SdkPlugin } from "../types/index.js";

export class PluginRegistry {
  private readonly plugins: SdkPlugin[];

  constructor(plugins: SdkPlugin[] = []) {
    this.plugins = [...plugins];
  }

  async runBeforeRequest(url: string, init: RequestInit): Promise<RequestInit> {
    let current = init;
    for (const plugin of this.plugins) {
      if (plugin.beforeRequest) {
        current = await plugin.beforeRequest(url, current);
      }
    }
    return current;
  }

  async runAfterResponse(response: Response): Promise<Response> {
    let current = response;
    for (const plugin of this.plugins) {
      if (plugin.afterResponse) {
        current = await plugin.afterResponse(current);
      }
    }
    return current;
  }

  runOnError(error: Error): void {
    for (const plugin of this.plugins) {
      if (plugin.onError) {
        plugin.onError(error);
      }
    }
  }
}
