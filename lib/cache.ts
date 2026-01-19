// Simple in-memory cache for user data and session state
export class AppCache {
  private static instance: AppCache;
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();

  static getInstance() {
    if (!AppCache.instance) {
      AppCache.instance = new AppCache();
    }
    return AppCache.instance;
  }

  set(key: string, value: any, ttl = 5 * 60 * 1000) {
    // 5 minutes default TTL
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  has(key: string) {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// Cache keys for consistency
export const CACHE_KEYS = {
  USER_SESSION: "user_session",
  MOOD_POSTS: "mood_posts",
  GOALS: "goals",
  JOURNAL_ENTRIES: "journal_entries",
  USER_PROFILE: "user_profile",
};

export const appCache = AppCache.getInstance();
