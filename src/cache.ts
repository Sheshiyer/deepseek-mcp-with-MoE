import { CacheEntry } from './types';

export class Cache {
  private store: Map<string, CacheEntry>;

  constructor() {
    this.store = new Map();
  }

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.store.delete(key);
      return null;
    }

    return entry.result;
  }

  set(key: string, result: string, ttl: number, metadata?: Record<string, any>): void {
    this.store.set(key, {
      result,
      timestamp: Date.now(),
      ttl,
      metadata
    });
  }

  getMetadata(key: string): Record<string, any> | null {
    const entry = this.store.get(key);
    return entry?.metadata || null;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  // Helper method to generate cache keys for tool chains
  static generateChainKey(steps: { toolName: string; params: any }[]): string {
    return steps.map(step => 
      `${step.toolName}:${JSON.stringify(step.params)}`
    ).join('|');
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.store.delete(key);
      }
    }
  }
}
