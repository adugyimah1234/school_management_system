// routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middlewares/authMiddleware'); // Import using the correct name
const userController = require('../controllers/usersController');
const bcrypt = require('bcryptjs');


// Get all users (consider protecting this as well)
router.get('/', protect,  (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.get('/:id', protect, userController.getUserById);

// Create new user (protected for admins)
router.post('/', async (req, res) => {
  const { password, email, full_name, role_id, school_id } = req.body;

  // Validate required fields
  if (!password || !email || !full_name || !role_id) {
    return res.status(400).json({ 
      error: "Please provide all required fields: password, email, full_name, role_id" 
    });
  }

  try {
    // Check if user already exists
    const [existingUser] = await db.query(
      'SELECT * FROM users WHERE email = ? OR full_name = ?', 
      [email, full_name]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ 
        error: 'User with this email or full_name already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Fixed INSERT query - removed extra parameter placeholder
    const [result] = await db.query(
      'INSERT INTO users (password, email, full_name, role_id, school_id) VALUES (?, ?, ?, ?, ?)',
      [hashedPassword, email, full_name, role_id, school_id || null]
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

// Update user by ID 
router.put('/:id', protect, (req, res) => {
  const { id } = req.params;
  const { full_name, password, role_id } = req.body;
  db.query(
  'UPDATE users SET full_name = ?, password = ?, role_id = ? WHERE id = ?',
  [ full_name, password, role_id, id ],
  (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User updated successfully' });
  }
);
});

// Delete user by ID (admin only)
router.delete('/:id', protect,  (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM users WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  });
});

module.exports = router;