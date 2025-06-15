const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
require('dotenv').config();

const tokenBlacklist = new Set();

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      school_id: user.school_id,
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

const isTokenBlacklisted = (token) => tokenBlacklist.has(token);

const blacklistToken = (token) => {
  tokenBlacklist.add(token);

  try {
    const decoded = jwt.decode(token);
    if (decoded?.exp) {
      const expirationTime = decoded.exp * 1000;
      const delay = expirationTime - Date.now();
      if (delay > 0) {
        setTimeout(() => tokenBlacklist.delete(token), delay);
      }
    }
  } catch (error) {
    console.error('Error setting up token cleanup:', error);
  }
};

// ✅ LOGIN with await
// ✅ LOGIN with username instead of email
exports.login = async (req, res) => {
  const { username, password } = req.body; // ⬅️ changed from email

  try {
    const [results] = await db.query(`
      SELECT users.*, roles.name AS role 
      FROM users 
      JOIN roles ON users.role_id = roles.id 
      WHERE users.username = ?
    `, [username]);

    if (!results.length) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = generateToken(user);
    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// ✅ REGISTER with await
exports.register = async (req, res) => {
  const { full_name, username,  password, role, school_id } = req.body;

if (!full_name || !username || !password || !role || !school_id) {
  return res.status(400).json({ message: 'All fields are required' });
}

  try {
    const [existing] = await db.query(
  'SELECT id FROM users WHERE username = ?',
  [ username]
);

if (existing.length > 0) {
  return res.status(400).json({ message: 'Username already registered' });
}

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(`
  INSERT INTO users (full_name, username, password, role, school_id)
  VALUES (?, ?, ?, ?, ?)
`, [full_name, username, hashedPassword, role, school_id]);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ✅ LOGOUT remains unchanged
exports.logout = (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      blacklistToken(token);
    }

    res.status(200).json({ message: 'Logout successful', success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout error', error: error.message });
  }
};

// ✅ VALIDATE TOKEN with await
exports.validateToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    if (isTokenBlacklisted(token)) {
      return res.status(401).json({ success: false, message: 'Token has been invalidated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [results] = await db.query(
      'SELECT id, role_id FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!results.length) {
      blacklistToken(token);
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: { id: decoded.id, role: decoded.role },
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Export blacklist checker for middleware
exports.isTokenBlacklisted = isTokenBlacklisted;
