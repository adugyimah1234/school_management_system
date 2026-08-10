const redisClient = require('../config/redis');
const logger = require('./logger');

/**
 * Professional Redis Cache Manager
 * Supports: Getting, Setting (with TTL), and Invalidating cache keys
 */
class CacheManager {
  /**
   * Get data from cache
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    try {
      if (!redisClient.isReady) return null;
      const data = await redisClient.get(key);
      if (data) {
        logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(data);
      }
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error('Cache Get Error: ' + error.message);
      return null;
    }
  }

  /**
   * Set data in cache
   * @param {string} key
   * @param {any} value
   * @param {number} ttl - Time to live in seconds (default 1 hour)
   */
  async set(key, value, ttl = 3600) {
    try {
      if (!redisClient.isReady) return;
      await redisClient.set(key, JSON.stringify(value), {
        EX: ttl
      });
      logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error('Cache Set Error: ' + error.message);
    }
  }

  /**
   * Remove a specific key from cache
   * @param {string} key
   */
  async del(key) {
    try {
      if (!redisClient.isReady) return;
      await redisClient.del(key);
      logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      logger.error('Cache Del Error: ' + error.message);
    }
  }

  /**
   * Professional Cache Invalidation (Pattern-based)
   * Example: Clear all student-related cache for a specific school
   * @param {string} pattern - e.g., "students:school_123:*"
   */
  async delByPattern(pattern) {
    try {
      if (!redisClient.isReady) return;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.debug(`Cache Pattern DEL: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      logger.error('Cache Pattern Del Error: ' + error.message);
    }
  }
}

module.exports = new CacheManager();
