/**
 * Redis Cache Service for CrowdBeat
 * Provides caching layer for frequently accessed data
 */

const redis = require('redis');

// Cache key prefixes
const CACHE_KEYS = {
  SESSION: 'session:',
  SESSION_LIST: 'sessions:list:',
  USER: 'user:',
  USER_PROFILE: 'user:profile:',
  LEADERBOARD: 'leaderboard:',
  SONG: 'song:',
  SONG_LIBRARY: 'library:songs:',
  LYRICS: 'lyrics:',
  SETTINGS: 'settings:',
  ANNOUNCEMENTS: 'announcements:active',
  STATS: 'stats:',
};

// Default TTLs in seconds
const TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
};

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.fallbackMode = false;
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.warn('Redis: Max reconnection attempts reached, entering fallback mode');
              this.fallbackMode = true;
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis: Connected');
        this.isConnected = true;
        this.fallbackMode = false;
      });

      this.client.on('disconnect', () => {
        console.log('Redis: Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.warn('Redis connection failed, running without cache:', error.message);
      this.fallbackMode = true;
      return false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (this.fallbackMode || !this.isConnected) return null;

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error.message);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttl = TTL.MEDIUM) {
    if (this.fallbackMode || !this.isConnected) return false;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error.message);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key) {
    if (this.fallbackMode || !this.isConnected) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache del error:', error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern) {
    if (this.fallbackMode || !this.isConnected) return false;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache delPattern error:', error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (this.fallbackMode || !this.isConnected) return false;

    try {
      return await this.client.exists(key);
    } catch (error) {
      console.error('Cache exists error:', error.message);
      return false;
    }
  }

  /**
   * Increment counter
   */
  async incr(key, ttl = TTL.SHORT) {
    if (this.fallbackMode || !this.isConnected) return null;

    try {
      const value = await this.client.incr(key);
      if (value === 1) {
        await this.client.expire(key, ttl);
      }
      return value;
    } catch (error) {
      console.error('Cache incr error:', error.message);
      return null;
    }
  }

  /**
   * Get or set with callback
   */
  async getOrSet(key, callback, ttl = TTL.MEDIUM) {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute callback to get fresh data
    const data = await callback();
    
    // Cache the result
    await this.set(key, data, ttl);
    
    return data;
  }

  // ==================== Specific Cache Methods ====================

  /**
   * Cache session details
   */
  async cacheSession(sessionId, data) {
    return this.set(`${CACHE_KEYS.SESSION}${sessionId}`, data, TTL.MEDIUM);
  }

  async getSession(sessionId) {
    return this.get(`${CACHE_KEYS.SESSION}${sessionId}`);
  }

  async invalidateSession(sessionId) {
    return this.del(`${CACHE_KEYS.SESSION}${sessionId}`);
  }

  /**
   * Cache user profile
   */
  async cacheUserProfile(userId, data) {
    return this.set(`${CACHE_KEYS.USER_PROFILE}${userId}`, data, TTL.MEDIUM);
  }

  async getUserProfile(userId) {
    return this.get(`${CACHE_KEYS.USER_PROFILE}${userId}`);
  }

  async invalidateUserProfile(userId) {
    return this.del(`${CACHE_KEYS.USER_PROFILE}${userId}`);
  }

  /**
   * Cache leaderboard
   */
  async cacheLeaderboard(type, data) {
    return this.set(`${CACHE_KEYS.LEADERBOARD}${type}`, data, TTL.MEDIUM);
  }

  async getLeaderboard(type) {
    return this.get(`${CACHE_KEYS.LEADERBOARD}${type}`);
  }

  async invalidateLeaderboards() {
    return this.delPattern(`${CACHE_KEYS.LEADERBOARD}*`);
  }

  /**
   * Cache song library query
   */
  async cacheSongLibrary(queryHash, data) {
    return this.set(`${CACHE_KEYS.SONG_LIBRARY}${queryHash}`, data, TTL.SHORT);
  }

  async getSongLibrary(queryHash) {
    return this.get(`${CACHE_KEYS.SONG_LIBRARY}${queryHash}`);
  }

  async invalidateSongLibrary() {
    return this.delPattern(`${CACHE_KEYS.SONG_LIBRARY}*`);
  }

  /**
   * Cache single song
   */
  async cacheSong(songId, data) {
    return this.set(`${CACHE_KEYS.SONG}${songId}`, data, TTL.LONG);
  }

  async getSong(songId) {
    return this.get(`${CACHE_KEYS.SONG}${songId}`);
  }

  async invalidateSong(songId) {
    await this.del(`${CACHE_KEYS.SONG}${songId}`);
    await this.invalidateSongLibrary();
  }

  /**
   * Cache system settings
   */
  async cacheSettings(data) {
    return this.set(CACHE_KEYS.SETTINGS, data, TTL.LONG);
  }

  async getSettings() {
    return this.get(CACHE_KEYS.SETTINGS);
  }

  async invalidateSettings() {
    return this.del(CACHE_KEYS.SETTINGS);
  }

  /**
   * Cache active announcements
   */
  async cacheAnnouncements(data) {
    return this.set(CACHE_KEYS.ANNOUNCEMENTS, data, TTL.MEDIUM);
  }

  async getAnnouncements() {
    return this.get(CACHE_KEYS.ANNOUNCEMENTS);
  }

  async invalidateAnnouncements() {
    return this.del(CACHE_KEYS.ANNOUNCEMENTS);
  }

  /**
   * Cache stats
   */
  async cacheStats(type, data) {
    return this.set(`${CACHE_KEYS.STATS}${type}`, data, TTL.SHORT);
  }

  async getStats(type) {
    return this.get(`${CACHE_KEYS.STATS}${type}`);
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (this.fallbackMode) {
      return { status: 'fallback', message: 'Running without Redis' };
    }
    
    if (!this.isConnected) {
      return { status: 'disconnected', message: 'Redis disconnected' };
    }

    try {
      await this.client.ping();
      return { status: 'healthy', message: 'Redis connected' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

// Export singleton instance
const cacheService = new CacheService();

module.exports = {
  cacheService,
  CACHE_KEYS,
  TTL,
};

