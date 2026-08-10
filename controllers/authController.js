const authService = require('../services/authService');
const logger = require('../utils/logger');
const response = require('../utils/apiResponse');

/**
 * Auth Controller
 * Handles authentication requests and delegates to authService
 */

// ✅ LOGIN
exports.login = async (req, res, next) => {
  const { username, password } = req.body;
  try {
    const data = await authService.login(username, password);
    return response.success(res, data, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// ✅ REGISTER
exports.register = async (req, res, next) => {
  const { full_name, username, password, role, school_id } = req.body;

  if (!full_name || !username || !password || !role || !school_id) {
    return response.error(res, 'All fields are required', 400);
  }

  try {
    const result = await authService.register({ full_name, username, password, role, school_id });
    return response.success(res, result, 'User registered successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ✅ LOGOUT
exports.logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await authService.blacklistToken(token);
    }
    return response.success(res, null, 'Logout successful');
  } catch (err) {
    next(err);
  }
};

// ✅ VALIDATE TOKEN
exports.validateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return response.error(res, 'No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const user = await authService.validateToken(token);

    return response.success(res, user, 'Token is valid');
  } catch (error) {
    return response.error(res, 'Invalid or expired token', 401);
  }
};

// ✅ CHANGE PASSWORD
exports.changePassword = async (req, res, next) => {
  const { username, currentPassword, newPassword } = req.body;

  if (!username || !currentPassword || !newPassword) {
    return response.error(res, 'All fields are required', 400);
  }

  try {
    await authService.changePassword(username, currentPassword, newPassword);
    return response.success(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

// Export blacklist checker for middleware (legacy support)
exports.isTokenBlacklisted = async (token) => await authService.isTokenBlacklisted(token);
