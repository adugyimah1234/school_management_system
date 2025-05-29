const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db'); // your mysql db connection
require('dotenv').config();

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, 
      role: user.role, 
      school_id: user.school_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  const sql = `
    SELECT users.*, roles.name AS role 
    FROM users 
    JOIN roles ON users.role_id = roles.id 
    WHERE users.email = ?
  `;

  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ message: 'DB error', err });

    if (!results.length) return res.status(401).json({ message: 'Invalid email or password' });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    const token = generateToken(user); // now includes role name like "admin"
    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, role: user.role }
    });
  });
};


exports.register = async (req, res) => {
  try {
    const { full_name, email, password, role, school_id } = req.body;

    if (!full_name || !email || !password || !role || !school_id) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const checkSql = 'SELECT id FROM users WHERE email = ?';
    db.query(checkSql, [email], async (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', err });

      if (result.length > 0) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const insertSql = `
        INSERT INTO users (full_name, email, password, role, school_id)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.query(insertSql, [full_name, email, hashedPassword, role, school_id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Insert error', err });
        res.status(201).json({ message: 'User registered successfully' });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal error', error });
  }
};

exports.logout = (req, res) => {
    res.status(200).json({ message: 'Logout successful' });
};