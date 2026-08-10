const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('./logger');
const notificationService = require('../services/notificationService');

// Use IORedis for BullMQ as per industry standards
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Critical for BullMQ
});

/**
 * --- QUEUES ---
 */
const notificationQueue = new Queue('notifications', { connection });

/**
 * --- WORKERS ---
 * These run in the background and process jobs one by one.
 */
const worker = new Worker('notifications', async (job) => {
  const { type, payload } = job.data;

  try {
    logger.debug(`Processing Background Job: ${job.id} (${type})`);

    switch (type) {
      case 'EMAIL_WELCOME':
        await notificationService.sendStudentWelcome(payload.email, payload.name);
        break;

      case 'SMS_PAYMENT':
        await notificationService.sendPaymentConfirmation(payload.phone, payload.amount, payload.balance);
        break;

      default:
        logger.warn(`Unknown notification type: ${type}`);
    }
  } catch (error) {
    logger.error(`Error in Worker ${job.id}: ${error.message}`);
    throw error; // BullMQ will handle retries automatically
  }
}, {
  connection,
  concurrency: 5 // Process 5 notifications at a time
});

worker.on('completed', (job) => logger.debug(`Job ${job.id} COMPLETED`));
worker.on('failed', (job, err) => logger.error(`Job ${job.id} FAILED: ${err.message}`));

/**
 * --- PUBLIC API ---
 */
const addJob = async (type, payload) => {
  try {
    await notificationQueue.add(type, { type, payload }, {
      attempts: 3, // Retry 3 times if it fails
      backoff: { type: 'exponential', delay: 5000 } // Wait longer between each retry
    });
  } catch (error) {
    logger.error('Failed to add job to queue: ' + error.message);
  }
};

module.exports = { addJob };
