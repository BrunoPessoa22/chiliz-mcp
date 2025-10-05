import { RateLimitConfig } from '../types/index.js';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry>;
  private configs: Map<string, RateLimitConfig>;

  constructor() {
    this.limits = new Map();
    this.configs = new Map();
  }

  configure(name: string, config: RateLimitConfig) {
    this.configs.set(name, config);
  }

  async checkLimit(name: string): Promise<boolean> {
    const config = this.configs.get(name);
    if (!config) {
      // No rate limit configured
      return true;
    }

    const now = Date.now();
    const entry = this.limits.get(name);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.limits.set(name, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return true;
    }

    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded
      return false;
    }

    // Increment counter
    entry.count++;
    return true;
  }

  async waitForLimit(name: string): Promise<void> {
    while (!(await this.checkLimit(name))) {
      const entry = this.limits.get(name);
      if (entry) {
        const waitTime = entry.resetTime - Date.now();
        if (waitTime > 0) {
          await this.sleep(Math.min(waitTime, 1000)); // Wait max 1 second at a time
        }
      }
    }
  }

  getRemainingRequests(name: string): number {
    const config = this.configs.get(name);
    if (!config) {
      return Infinity;
    }

    const entry = this.limits.get(name);
    const now = Date.now();

    if (!entry || now > entry.resetTime) {
      return config.maxRequests;
    }

    return Math.max(0, config.maxRequests - entry.count);
  }

  getResetTime(name: string): number | null {
    const entry = this.limits.get(name);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.resetTime) {
      return null;
    }

    return entry.resetTime;
  }

  reset(name: string): void {
    this.limits.delete(name);
  }

  resetAll(): void {
    this.limits.clear();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();