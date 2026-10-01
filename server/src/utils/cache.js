/**
 * Simple in-memory cache with TTL (Time To Live) support.
 */
class InMemoryCache {
  constructor(defaultTtlMs = 5 * 60 * 1000) { // 5 minutes
    this.cache = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key, data, ttlMs = this.defaultTtlMs) {
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { data, expiresAt });
  }

  clear() {
    this.cache.clear();
  }
}

// Global cache instance for Ticketmaster & Event queries
const eventCache = new InMemoryCache(5 * 60 * 1000);

module.exports = eventCache;
