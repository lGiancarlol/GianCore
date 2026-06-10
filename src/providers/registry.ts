import type { IProvider } from "./types";

/**
 * ProviderRegistry
 *
 * Central registry for all active provider instances.
 * Providers are registered at startup (loaded from DB config).
 */
class ProviderRegistry {
  private providers = new Map<string, IProvider>();

  register(provider: IProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): IProvider | undefined {
    return this.providers.get(id);
  }

  getOrThrow(id: string): IProvider {
    const p = this.providers.get(id);
    if (!p) throw new Error(`Provider not found: ${id}`);
    return p;
  }

  all(): IProvider[] {
    return Array.from(this.providers.values());
  }

  unregister(id: string): void {
    this.providers.delete(id);
  }
}

// Singleton — shared across the app
export const providerRegistry = new ProviderRegistry();
