const logger = require('../utils/logger');

/**
 * Validates that all required environment variables are set
 */
const validateEnv = () => {
  const required = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'ENABLE_NOTIFICATIONS'
  ];

  // Only require Redis in production
  if (process.env.NODE_ENV === 'production') {
    required.push('REDIS_URL');
  }

  const missing = [];
  required.forEach(variable => {
    if (!process.env[variable]) {
      missing.push(variable);
    }
  });

  if (missing.length > 0) {
    logger.error('CRITICAL: Missing environment variables: ' + missing.join(', '));
    logger.error('The application will now exit.');
    process.exit(1);
  }

  logger.info('✅ Environment variables validated.');
};

module.exports = validateEnv;
