/**
 * Camada de Cache em Memória com TTL e suporte a isolamento por Tenant.
 */
class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  generateKey(tenantId, dashboardId, view, filters, pagination) {
    const rawString = JSON.stringify({ tenantId, dashboardId, view, filters, pagination });
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
      hash = ((hash << 5) - hash) + rawString.charCodeAt(i);
      hash |= 0;
    }
    return `cache:${tenantId}:${dashboardId}:${Math.abs(hash)}`;
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.store.set(key, { value, expiresAt });
  }

  delete(key) {
    this.store.delete(key);
  }

  async getOrSet(key, fetcherFn, ttlSeconds = 300) {
    const cached = this.get(key);
    if (cached !== null) {
      return { data: cached, cacheHit: true };
    }

    const freshData = await fetcherFn();
    this.set(key, freshData, ttlSeconds);
    return { data: freshData, cacheHit: false };
  }
}

export const CacheService = new MemoryCache();
