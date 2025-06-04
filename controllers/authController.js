// Enhanced authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
require('dotenv').config();

// In-memory token blacklist (for production, use Redis or database)
const tokenBlacklist = new Set();

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      role: user.role, 
      school_id: user.school_id,
      iat: Math.floor(Date.now() / 1000) // issued at time
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Helper function to check if token is blacklisted
const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

// Helper function to add token to blacklist
const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  
  // Auto-cleanup expired tokens from blacklist (optional)
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const expirationTime = decoded.exp * 1000; // Convert to milliseconds
      const timeUntilExpiration = expirationTime - Date.now();
      
      if (timeUntilExpiration > 0) {
        setTimeout(() => {
          tokenBlacklist.delete(token);
        }, timeUntilExpiration);
      }
    }
  } catch (error) {
    console.error('Error setting up token cleanup:', error);
  }
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

    const token = generateToken(user);
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

// Enhanced logout with token blacklisting
exports.logout = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Add token to blacklist
      blacklistToken(token);
      
      return res.status(200).json({ 
        message: 'Logout successful',
        success: true 
      });
    }
    
    // Even if no token, consider logout successful
    res.status(200).json({ 
      message: 'Logout successful',
      success: true 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      message: 'Logout error', 
      error: error.message 
    });
  }
};

// New endpoint to validate token
exports.validateToken = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      return res.status(401).json({ 
        success: false,
        message: 'Token has been invalidated' 
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Optionally verify user still exists in database
      const sql = 'SELECT id, email, role_id FROM users WHERE id = ?';
      db.query(sql, [decoded.id], (err, results) => {
        if (err) {
          return res.status(500).json({ 
            success: false,
            message: 'Database error' 
          });
        }

        if (!results.length) {
          // User no longer exists, blacklist the token
          blacklistToken(token);
          return res.status(401).json({ 
            success: false,
            message: 'User not found' 
          });
        }

        res.status(200).json({ 
          success: true,
          message: 'Token is valid',
          user: { id: decoded.id, role: decoded.role }
        });
      });
    } catch (jwtError) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token',
        error: jwtError.message 
      });
    }
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during token validation' 
    });
  }
};

// Export the blacklist checker for use in middleware
exports.isTokenBlacklisted = isTokenBlacklisted;