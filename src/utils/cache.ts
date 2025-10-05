import NodeCache from 'node-cache';
import { config } from '../config/index.js';

class CacheManager {
  private caches: Map<string, NodeCache>;

  constructor() {
    this.caches = new Map();
    this.initializeCaches();
  }

  private initializeCaches() {
    // Initialize different caches with specific TTL
    this.caches.set('prices', new NodeCache({
      stdTTL: config.cache.prices.ttl,
      checkperiod: config.cache.prices.checkperiod
    }));

    this.caches.set('tokenList', new NodeCache({
      stdTTL: config.cache.tokenList.ttl,
      checkperiod: config.cache.tokenList.checkperiod
    }));

    this.caches.set('blockchainInfo', new NodeCache({
      stdTTL: config.cache.blockchainInfo.ttl,
      checkperiod: config.cache.blockchainInfo.checkperiod
    }));

    this.caches.set('transactions', new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60
    }));

    this.caches.set('balances', new NodeCache({
      stdTTL: 30, // 30 seconds
      checkperiod: 10
    }));
  }

  get(cacheName: string, key: string): any {
    const cache = this.caches.get(cacheName);
    if (!cache) {
      throw new Error(`Cache ${cacheName} not found`);
    }

    if (config.debug) {
      const hasKey = cache.has(key);
      console.log(`Cache ${cacheName} - Key: ${key} - Hit: ${hasKey}`);
    }

    return cache.get(key);
  }

  set(cacheName: string, key: string, value: any, ttl?: number): boolean {
    const cache = this.caches.get(cacheName);
    if (!cache) {
      throw new Error(`Cache ${cacheName} not found`);
    }

    if (config.debug) {
      console.log(`Cache ${cacheName} - Setting key: ${key} - TTL: ${ttl || 'default'}`);
    }

    return cache.set(key, value, ttl || 0);
  }

  del(cacheName: string, key: string): number {
    const cache = this.caches.get(cacheName);
    if (!cache) {
      throw new Error(`Cache ${cacheName} not found`);
    }
    return cache.del(key);
  }

  flush(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    if (!cache) {
      throw new Error(`Cache ${cacheName} not found`);
    }
    cache.flushAll();
  }

  flushAll(): void {
    this.caches.forEach(cache => cache.flushAll());
  }

  getStats(cacheName?: string): any {
    if (cacheName) {
      const cache = this.caches.get(cacheName);
      if (!cache) {
        throw new Error(`Cache ${cacheName} not found`);
      }
      return cache.getStats();
    }

    const stats: Record<string, any> = {};
    this.caches.forEach((cache, name) => {
      stats[name] = cache.getStats();
    });
    return stats;
  }
}

// Singleton instance
export const cacheManager = new CacheManager();