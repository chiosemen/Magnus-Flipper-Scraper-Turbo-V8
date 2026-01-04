
/**
 * SIMULATED REDIS ADAPTER
 * This mimics Upstash/IORedis behavior for the Scheduler Engine.
 * It allows us to write "real" scheduler code without a live Redis connection.
 */
class VirtualRedis {
  private kv = new Map<string, any>();
  private zsets = new Map<string, Map<string, number>>();
  private expiries = new Map<string, number>();

  constructor() {
    // Cleanup loop for expired keys
    setInterval(() => {
      const now = Date.now();
      for (const [key, exp] of this.expiries) {
        if (now > exp) {
          this.kv.delete(key);
          this.zsets.delete(key);
          this.expiries.delete(key);
        }
      }
    }, 1000);
  }

  private evictIfExpired(key: string) {
    const exp = this.expiries.get(key);
    if (!exp) return false;
    if (Date.now() > exp) {
      this.kv.delete(key);
      this.zsets.delete(key);
      this.expiries.delete(key);
      return true;
    }
    return false;
  }

  // --- KV Operations ---
  async get(key: string): Promise<string | null> {
    this.evictIfExpired(key);
    return this.kv.get(key) || null;
  }

  async set(key: string, value: string, opts?: { nx?: boolean; ex?: number }): Promise<boolean | 'OK' | null> {
    this.evictIfExpired(key);
    if (opts?.nx && this.kv.has(key)) return null;
    
    this.kv.set(key, value);
    if (opts?.ex) {
      this.expiries.set(key, Date.now() + (opts.ex * 1000));
    }
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    this.evictIfExpired(key);
    const val = (this.kv.get(key) || 0) + 1;
    this.kv.set(key, val);
    return val;
  }

  async decr(key: string): Promise<number> {
    this.evictIfExpired(key);
    const val = (this.kv.get(key) || 0) - 1;
    this.kv.set(key, val);
    return val;
  }

  async del(key: string): Promise<number> {
    this.evictIfExpired(key);
    const existed = this.kv.delete(key);
    this.zsets.delete(key);
    return existed ? 1 : 0;
  }

  // --- ZSET Operations (Scheduler) ---
  async zadd(key: string, score: number, member: string): Promise<number> {
    this.evictIfExpired(key);
    if (!this.zsets.has(key)) this.zsets.set(key, new Map());
    this.zsets.get(key)!.set(member, score);
    return 1;
  }

  async zrangebyscore(key: string, min: number | '-inf', max: number | '+inf', opts?: { limit?: { offset: number; count: number } }): Promise<string[]> {
    this.evictIfExpired(key);
    const set = this.zsets.get(key);
    if (!set) return [];

    const minVal = min === '-inf' ? Number.NEGATIVE_INFINITY : min;
    const maxVal = max === '+inf' ? Number.POSITIVE_INFINITY : max;

    const entries = Array.from(set.entries())
      .filter(([_, score]) => score >= minVal && score <= maxVal)
      .sort((a, b) => a[1] - b[1]); // Sort by score ASC

    const results = entries.map(e => e[0]);
    
    if (opts?.limit) {
      return results.slice(opts.limit.offset, opts.limit.offset + opts.limit.count);
    }
    return results;
  }

  async zrem(key: string, member: string): Promise<number> {
    this.evictIfExpired(key);
    const set = this.zsets.get(key);
    if (!set) return 0;
    return set.delete(member) ? 1 : 0;
  }

  // --- Hash Operations (Jobs) ---
  async hset(key: string, field: string, value: any) {
    this.evictIfExpired(key);
    let hash = this.kv.get(key);
    if (!hash) hash = {};
    hash[field] = value;
    this.kv.set(key, hash);
  }

  async hgetall(key: string) {
    this.evictIfExpired(key);
    return this.kv.get(key) || {};
  }
}

export const redis = new VirtualRedis();
