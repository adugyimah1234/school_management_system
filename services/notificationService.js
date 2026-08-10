const logger = require('../utils/logger');

/**
 * Professional Notification Service
 * Handles the actual sending of Emails and SMS.
 * Currently uses placeholders until SMTP/SMS APIs are integrated.
 */
class NotificationService {
  constructor() {
    this.enabled = process.env.ENABLE_NOTIFICATIONS === 'true';
  }

  /**
   * Send Email logic
   */
  async sendEmail(to, subject, template, data) {
    if (!this.enabled) {
      logger.info(`[SIMULATED EMAIL] To: ${to} | Subject: ${subject} | Data: ${JSON.stringify(data)}`);
      return true;
    }

    try {
      // TODO: Integrate Nodemailer / SendGrid / AWS SES here
      logger.info(`Sending REAL email to ${to}...`);
      // await realEmailProvider.send(...)
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error; // Throw so the queue knows to retry
    }
  }

  /**
   * Send SMS logic
   */
  async sendSMS(phoneNumber, message) {
    if (!this.enabled) {
      logger.info(`[SIMULATED SMS] To: ${phoneNumber} | Message: ${message}`);
      return true;
    }

    try {
      // TODO: Integrate Twilio / Hubtel / Arkesel here
      logger.info(`Sending REAL SMS to ${phoneNumber}...`);
      // await realSMSProvider.send(...)
      return true;
    } catch (error) {
      logger.error(`Failed to send SMS to ${phoneNumber}: ${error.message}`);
      throw error;
    }
  }

  /**
   * High-level Helper: Welcome Email for new students
   */
  async sendStudentWelcome(email, name) {
    return this.sendEmail(email, 'Welcome to Nwoma', 'welcome_student', { name });
  }

  /**
   * High-level Helper: Payment Receipt SMS
   */
  async sendPaymentConfirmation(phone, amount, balance) {
    const msg = `Payment Received: GHS ${amount}. Your remaining balance is GHS ${balance}. Thank you.`;
    return this.sendSMS(phone, msg);
  }
}

module.exports = new NotificationService();
