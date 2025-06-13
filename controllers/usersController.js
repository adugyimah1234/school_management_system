const bcrypt = require('bcryptjs');
const db = require('../config/db'); // uses mysql2/promise

// ✅ Register new user
exports.register = async (req, res) => {
  const { full_name, email, password, role_id, school_id } = req.body;

  if (!full_name || !email || !password || !role_id || !school_id) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (full_name, email, password, role_id, school_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    await db.query(sql, [full_name, email, hashed, role_id, school_id]);

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('User registration error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// ✅ Get user by ID
exports.getUserById = async (req, res) => {
  const userId = req.params.id;

  try {
    const [results] = await db.query(
      'SELECT id, full_name, email, role_id, school_id FROM users WHERE id = ?',
      [userId]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = results[0];
    res.status(200).json({ message: 'User fetched successfully', user });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};
