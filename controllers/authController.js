const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const User = require('../models/user');
require('dotenv').config();

const tokenBlacklist = new Set();

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role_name || user.role,
      role_id: user.role_id || null,
      tenant_id: user.tenant_id || null,
      school_id: user.school_id,
      branch_id: user.branch_id || null,
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

// ✅ LOGIN with username instead of email
exports.login = async (req, res) => {
  const { username, password } = req.body; // ⬅️ changed from email

  try {
    const [results] = await db.query(`
      SELECT users.*, roles.name AS role_name, roles.id AS role_id
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
      user: {
        id: user.id,
        role: user.role_name,
        role_id: user.role_id,
        tenant_id: user.tenant_id,
        school_id: user.school_id,
        branch_id: user.branch_id
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// ✅ REGISTER with await
exports.register = async (req, res) => {
  const {
    full_name,
    username,
    password,
    role_id,
    role,
    tenant_id,
    school_id,
    branch_id
  } = req.body;

if (!full_name || !username || !password || !school_id || !tenant_id || (!role_id && !role)) {
  return res.status(400).json({ message: 'All fields are required' });
}

  try {
    let resolvedRoleId = role_id;
    if (!resolvedRoleId && role) {
      const [roleRows] = await db.query('SELECT id FROM roles WHERE name = ? LIMIT 1', [role]);
      if (!roleRows.length) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      resolvedRoleId = roleRows[0].id;
    }

    const [schoolRows] = await db.query(
      'SELECT id FROM schools WHERE id = ? AND tenant_id = ? LIMIT 1',
      [school_id, tenant_id]
    );
    if (!schoolRows.length) {
      return res.status(400).json({ message: 'School does not belong to tenant' });
    }

    if (branch_id) {
      const [branchRows] = await db.query(
        'SELECT id FROM branches WHERE id = ? AND tenant_id = ? AND school_id = ? LIMIT 1',
        [branch_id, tenant_id, school_id]
      );
      if (!branchRows.length) {
        return res.status(400).json({ message: 'Branch does not belong to tenant/school' });
      }
    }
    const [existing] = await db.query(
  'SELECT id FROM users WHERE username = ? AND tenant_id = ?',
  [username, tenant_id]
);

if (existing.length > 0) {
  return res.status(400).json({ message: 'Username already registered' });
}

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(`
  INSERT INTO users (full_name, username, password, role_id, tenant_id, school_id, branch_id)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`, [full_name, username, hashedPassword, resolvedRoleId, tenant_id, school_id, branch_id || null]);

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
      `SELECT u.id, u.tenant_id, u.school_id, u.branch_id, r.name AS role, r.id AS role_id
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (!results.length) {
      blacklistToken(token);
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: results[0],
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ✅ CHANGE PASSWORD
exports.changePassword = async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;

  if (!username || !currentPassword || !newPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const user = await User.findByUsername(username);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.update(user.id, { password: hashedPassword });

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Export blacklist checker for middleware
exports.isTokenBlacklisted = isTokenBlacklisted;
