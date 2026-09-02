const db = require('../config/db');
const crypto = require('crypto');

// 1. Get user notifications
exports.getUserNotifications = async (req, res) => {
  try {
    if (!req.user) {
        console.error('Notification Error: User context missing from request');
        return res.status(401).json({ success: false, error: 'User context missing' });
    }

    const user_id = req.user.id;
    const garrison_id = req.user.garrison_id || null;
    const school_id = req.user.school_id || null;

    console.log(`Fetching notifications for user ${user_id} (Garrison: ${garrison_id}, School: ${school_id})`);

    let query = `
      SELECT * FROM notifications
      WHERE (user_id = ? OR (user_id IS NULL AND garrison_id IS NULL AND school_id IS NULL))
    `;
    const params = [user_id];

    if (school_id) {
      query += ` OR (school_id = ?)`;
      params.push(school_id);
    }

    if (garrison_id) {
      query += ` OR (garrison_id = ? AND school_id IS NULL)`;
      params.push(garrison_id);
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const [rows] = await db.query(query, params);
    console.log(`Found ${rows.length} notifications.`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Fetch Notifications SQL Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE notifications SET is_read = true WHERE id = ?', [id]);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Mark all as read
exports.markAllAsRead = async (req, res) => {
  try {
    const user_id = req.user.id;
    await db.query('UPDATE notifications SET is_read = true WHERE user_id = ?', [user_id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. Create Notification (Utility for other controllers)
exports.createNotification = async ({ user_id, title, message, type, school_id, garrison_id }) => {
  try {
    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO notifications (id, user_id, title, message, type, school_id, garrison_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, user_id || null, title, message, type || 'info', school_id || null, garrison_id || null]
    );
    return id;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
};
