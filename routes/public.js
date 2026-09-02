const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * @route   GET /api/public/resolve-domain/:hostname
 * @desc    Resolves a hostname to a site type and ID (Used by Frontend Middleware)
 */
router.get('/resolve-domain/:hostname', async (req, res) => {
  const { hostname } = req.params;
  const cleanHost = hostname.split(':')[0]; // Remove port if present

  try {
    // 1. Check if it's a Garrison domain
    const [[garrison]] = await db.query(
      'SELECT id FROM garrisons WHERE custom_domain = ? AND is_website_enabled = TRUE',
      [cleanHost]
    );
    if (garrison) return res.json({ type: 'garrison', id: garrison.id });

    // 2. Check if it's a School domain
    const [[school]] = await db.query(
      'SELECT id FROM schools WHERE custom_domain = ? AND is_website_enabled = TRUE',
      [cleanHost]
    );
    if (school) return res.json({ type: 'school', id: school.id });

    // 3. Check for specific subdomains (e.g., admin.nwoma.com)
    if (cleanHost.startsWith('admin.')) {
      return res.json({ type: 'admin' });
    }

    // Default: Not found
    res.status(404).json({ type: 'unknown' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/public/garrison/:domain
 * @desc    Get public website settings for a garrison and its schools
 */
router.get('/garrison/:domain', async (req, res) => {
  const { domain } = req.params;

  try {
    const [[garrison]] = await db.query(
      `SELECT
        id, name, code, location,
        website_logo_url, primary_color, secondary_color,
        hero_title, hero_subtitle, about_text, contact_email,
        contact_phone, leader_name, leader_title, leader_message, leader_image_url
      FROM garrisons
      WHERE (custom_domain = ? OR id = ?) AND is_website_enabled = TRUE`,
      [domain, domain]
    );

    if (!garrison) {
      return res.status(404).json({ error: 'Garrison website not found' });
    }

    // Also fetch the schools belonging to this garrison
    const [schools] = await db.query(
      `SELECT id, name, address, custom_domain, is_website_enabled, website_logo_url, hero_subtitle
       FROM schools
       WHERE garrison_id = ?`,
      [garrison.id]
    );

    // Fetch news items
    const [news] = await db.query(
      `SELECT id, title, content, image_url, published_at
       FROM garrison_news
       WHERE garrison_id = ? AND is_active = TRUE
       ORDER BY published_at DESC LIMIT 3`,
      [garrison.id]
    );

    // Fetch documents
    const [documents] = await db.query(
      `SELECT id, title, file_url, file_type
       FROM school_documents
       WHERE owner_id = ? AND owner_type = 'garrison'`,
      [garrison.id]
    );

    res.json({ garrison, schools, news, documents });
  } catch (err) {
    console.error('Error fetching public garrison details:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
