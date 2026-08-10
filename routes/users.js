// routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middlewares/authMiddleware'); // Import using the correct name
const userController = require('../controllers/usersController');
const bcrypt = require('bcryptjs');


// Get all users (scoped by role)
router.get('/', protect, async (req, res) => {
  try {
    const user = req.user;
    let query = `
      SELECT u.id, u.full_name, u.username, u.email, u.role_id, u.school_id, u.garrison_id, r.name as role, s.name as school_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN schools s ON u.school_id = s.id
    `;
    let params = [];

    if (user.role === 'garrison_director' || user.role === 'admin') {
      query += ' WHERE u.garrison_id = ?';
      params = [user.garrison_id];
    } else if (user.role === 'school_admin' || user.school_id) {
      query += ' WHERE u.school_id = ?';
      params = [user.school_id];
    } else if (user.role !== 'superadmin' && user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [results] = await db.query(query, params);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', protect, userController.getUserById);
router.get('/:id/profile-image', userController.getProfileImage);

// Create new user (protected for admins)
router.post('/', protect, async (req, res) => {
  const { username, password, full_name, role_id, school_id, email } = req.body;
  const currentUser = req.user;

  if (!username || !password || !full_name || !role_id) {
    return res.status(400).json({
      error: "Please provide all required fields: username, password, full_name, role_id"
    });
  }

  try {
    let final_school_id = school_id;
    let garrison_id = currentUser.garrison_id;

    // Scoping logic for user creation
    if (currentUser.role === 'garrison_director' || currentUser.role === 'admin') {
      // Garrison Admins can create users for any school in their garrison
      // But we should verify if the school_id belongs to their garrison
      if (school_id) {
        const [schoolCheck] = await db.query('SELECT id FROM schools WHERE id = ? AND garrison_id = ?', [school_id, garrison_id]);
        if (schoolCheck.length === 0) {
          return res.status(403).json({ error: 'Selected school does not belong to your Garrison' });
        }
      }
    } else if (currentUser.role === 'school_admin') {
      // School Admins can only create users for their own school
      final_school_id = currentUser.school_id;
    } else if (currentUser.role !== 'superadmin' && currentUser.role !== 'super_admin') {
      return res.status(403).json({ error: 'Not authorized to create users' });
    }

    // Check if username already exists
    const [existingUser] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email || null]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        error: 'User with this username or email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const id = require('crypto').randomUUID();

    // Insert new user
    await db.query(
      'INSERT INTO users (id, username, password, full_name, email, role_id, school_id, garrison_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, username, hashedPassword, full_name, email || null, role_id, final_school_id || null, garrison_id]
    );

    res.status(201).json({
      id,
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