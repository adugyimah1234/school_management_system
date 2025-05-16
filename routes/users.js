// routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middlewares/authMiddleware'); // Import using the correct name
const userController = require('../controllers/usersController');

// Middleware to check if the user is an admin (adjust as needed)
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

// Get all users (consider protecting this as well)
router.get('/', protect, isAdmin, (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.get('/:id', protect, userController.getUserById);

// Create new user (protected for admins)
router.post('/', protect, isAdmin, (req, res) => {
  const { username, password, role } = req.body;
  db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, role], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.insertId });
  });
});

// Update user by ID 
router.put('/:id', protect, (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;
  db.query(
    'UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?',
    [username, password, role, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ message: 'User updated successfully' });
    }
  );
});

// Delete user by ID (admin only)
router.delete('/:id', protect, isAdmin, (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM users WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  });
});

module.exports = router;