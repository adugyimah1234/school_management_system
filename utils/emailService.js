const nodemailer = require('nodemailer');
const db = require('../config/db');

/**
 * Fetches dynamic SMTP settings from the database
 */
const getSmtpConfig = async () => {
    try {
        const [rows] = await db.query('SELECT setting_key, setting_value FROM settings WHERE setting_group = "communication"');
        const settings = {};
        rows.forEach(r => {
            try {
                settings[r.setting_key] = JSON.parse(r.setting_value);
            } catch (e) {
                settings[r.setting_key] = r.setting_value;
            }
        });
        return settings;
    } catch (err) {
        console.error('Failed to fetch SMTP settings from DB:', err.message);
        return null;
    }
};

/**
 * Sends an email alert using dynamic database settings
 * @param {Object} data
 * @param {string} data.to - Recipient email
 * @param {string} data.subject - Email subject
 * @param {string} data.text - Plain text content
 * @param {string} data.html - HTML content
 */
exports.sendEmail = async ({ to, subject, text, html }) => {
    const config = await getSmtpConfig();

    if (!config || !config.smtp_user || !config.smtp_pass) {
        console.warn('⚠️ SMTP not configured in System Settings. Skipping email alert for:', subject);
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: config.smtp_host || 'smtp.gmail.com',
            port: parseInt(config.smtp_port) || 587,
            secure: config.smtp_secure === 'true' || config.smtp_secure === true,
            auth: {
                user: config.smtp_user,
                pass: config.smtp_pass,
            },
        });

        await transporter.sendMail({
            from: `"Nwoma Security" <${config.smtp_user}>`,
            to,
            subject,
            text,
            html,
        });
        console.log('✅ Security alert email sent to:', to);
    } catch (error) {
        console.error('❌ Dynamic Email Alert Error:', error.message);
    }
};
