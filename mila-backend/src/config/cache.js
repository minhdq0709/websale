// In-memory cache (thay the Redis cho dev/ca nhan)
// Khi deploy production: thay bang ioredis
const store = new Map();

const cache = {
  async get(key) {
    const item = store.get(key);
    if (!item) return null;
    if (item.exp && Date.now() > item.exp) { store.delete(key); return null; }
    return item.val;
  },
  async set(key, val, ttlSeconds = 0) {
    store.set(key, { val, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0 });
  },
  async del(key) { store.delete(key); },
  async exists(key) { return (await this.get(key)) !== null; },
};

module.exports = cache;
