// Enhanced authMiddleware.js
const jwt = require('jsonwebtoken');
const { isTokenBlacklisted } = require('../controllers/authController');
require('dotenv').config();

exports.protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized, no token' 
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
    req.user = decoded;
    req.token = token; // Store token for potential blacklisting
    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false,
      message: 'Token failed',
      error: err.message 
    });
  }
};

exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Not authorized, admin access required' 
    });
  }
  next();
};