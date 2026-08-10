const { createClient } = require('redis');
const logger = require('../utils/logger');

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.warn('Redis: Max reconnection attempts reached. Continuing without Redis...');
        return false; // Stop retrying
      }
      return Math.min(retries * 500, 5000); // Gradual backoff
    }
  }
});

client.on('error', (err) => {
  logger.error('Redis Client Error: ' + (err.message || 'Is Redis installed and running?'));
});

client.on('connect', () => logger.info('✅ Connected to Redis'));

(async () => {
  try {
    await client.connect();
    logger.info('🚀 Redis client ready.');
  } catch (err) {
    logger.error('❌ Redis connection failed: ' + err.message);
    logger.warn('SaaS features like persistent logout and advanced rate limiting will be limited.');
  }
})();

module.exports = client;
