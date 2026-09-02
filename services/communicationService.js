const axios = require('axios');
const nodemailer = require('nodemailer');
const db = require('../config/db');
const logger = require('../utils/logger');

class CommunicationService {
  constructor() {
    this.settings = null;
  }

  async loadSettings() {
    try {
      const [rows] = await db.query('SELECT setting_key, setting_value FROM settings WHERE setting_group = "communication"');
      const commSettings = {};
      rows.forEach(r => { commSettings[r.setting_key] = r.setting_value; });
      this.settings = commSettings;
    } catch (err) {
      logger.error('Failed to load communication settings: ' + err.message);
    }
  }

  async sendSMS(to, message) {
    await this.loadSettings();
    if (!this.settings || !this.settings.sms_api_key) {
      logger.warn('SMS skipped: API key not configured.');
      return;
    }

    try {
      // Arkesel SMS Implementation
      const response = await axios.get('https://sms.arkesel.com/sms/api', {
        params: {
          action: 'send-sms',
          api_key: this.settings.sms_api_key,
          to: to.replace(/\s+/g, ''),
          from: this.settings.sms_sender_id || 'GARRISON',
          sms: message
        }
      });
      logger.info(`SMS sent to ${to}: ${response.data.code === 'ok' ? 'Success' : 'Failed'}`);
      return response.data;
    } catch (err) {
      logger.error('Arkesel SMS Error: ' + err.message);
    }
  }

  async sendEmail(to, subject, text, html, attachments = []) {
    await this.loadSettings();
    if (!this.settings || !this.settings.email_smtp_host) {
      logger.warn('Email skipped: SMTP not configured.');
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: this.settings.email_smtp_host,
        port: parseInt(this.settings.email_smtp_port || '587'),
        secure: this.settings.email_smtp_port === '465',
        auth: {
          user: this.settings.email_smtp_user,
          pass: this.settings.email_smtp_pass,
        },
      });

      const mailOptions = {
        from: `"${this.settings.email_from_name || 'Garrison Directorate'}" <${this.settings.email_from_address}>`,
        to,
        subject,
        text,
        html,
        attachments
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (err) {
      logger.error('SMTP Email Error: ' + err.message);
    }
  }
}

module.exports = new CommunicationService();
