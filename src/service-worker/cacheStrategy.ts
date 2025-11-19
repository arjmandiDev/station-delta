/**
 * Cache strategy for service worker.
 * 
 * Purpose: Defines caching strategies for different asset types.
 * Responsibilities: Determine cache strategy, handle cache invalidation.
 * Inputs: Request URLs, asset types.
 * Outputs: Cache strategy decisions.
 * Side effects: None (pure strategy logic).
 */

export type CacheStrategy = 'cache-first' | 'network-first' | 'network-only' | 'cache-only';

export interface CacheConfig {
  strategy: CacheStrategy;
  maxAge?: number; // in seconds
  maxEntries?: number;
}

export class CacheStrategyManager {
  private configs: Map<string, CacheConfig> = new Map();

  constructor() {
    // Default strategies
    this.configs.set('manifest', {
      strategy: 'network-first',
      maxAge: 3600, // 1 hour
    });

    this.configs.set('asset', {
      strategy: 'cache-first',
      maxAge: 7 * 24 * 3600, // 7 days
    });

    this.configs.set('texture', {
      strategy: 'cache-first',
      maxAge: 7 * 24 * 3600,
    });

    this.configs.set('model', {
      strategy: 'cache-first',
      maxAge: 7 * 24 * 3600,
    });
  }

  /**
   * Gets cache strategy for a URL.
   */
  getStrategy(url: string): CacheConfig {
    // Check for specific patterns
    if (url.includes('/manifest')) {
      return this.configs.get('manifest') || { strategy: 'network-first' };
    }

    if (url.endsWith('.ktx2') || url.endsWith('.jpg') || url.endsWith('.png')) {
      return this.configs.get('texture') || { strategy: 'cache-first' };
    }

    if (url.endsWith('.gltf') || url.endsWith('.glb')) {
      return this.configs.get('model') || { strategy: 'cache-first' };
    }

    return this.configs.get('asset') || { strategy: 'cache-first' };
  }

  /**
   * Sets custom strategy for a pattern.
   */
  setStrategy(pattern: string, config: CacheConfig): void {
    this.configs.set(pattern, config);
  }
}

