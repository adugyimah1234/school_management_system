// routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middlewares/authMiddleware'); // Import using the correct name
const userController = require('../controllers/usersController');
const bcrypt = require('bcryptjs');


// Get all users (consider protecting this as well)
router.get('/', protect, async  (req, res) => {
  try {
   const [results] = await db.query('SELECT * FROM users');
      res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', protect, userController.getUserById);

// Create new user (protected for admins)
router.post('/', async (req, res) => {
  const { username, password, full_name, role_id, school_id } = req.body;

  if (!username || !password || !full_name || !role_id) {
    return res.status(400).json({
      error: "Please provide all required fields: username, password, full_name, role_id"
    });
  }

  try {
    // Check if username already exists
    const [existingUser] = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [ username]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        error: 'User with this username or username already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user with username
    const [result] = await db.query(
      'INSERT INTO users (username, password,  full_name, role_id, school_id) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, full_name, role_id, school_id || null]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'User created successfully'
    });

  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: err.message });
  }
});


// Update user by ID with safe hashing and partial updates
router.put('/:id', protect, async (req, res) => {
  const { id } = req.params;
  const { full_name, username, password, role_id, school_id, status } = req.body;

  try {
    const updates = [];
    const values = [];

    if (full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(full_name);
    }

    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username);
    }

    if (role_id !== undefined) {
      updates.push('role_id = ?');
      values.push(role_id);
    }

    if (school_id !== undefined) {
      updates.push('school_id = ?');
      values.push(school_id);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (password) {
      // Only hash if password is provided & not empty
      const hashed = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      values.push(hashed);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });

  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: err.message });
  }
});


// Delete user by ID (admin only)
router.delete('/:id', protect, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;