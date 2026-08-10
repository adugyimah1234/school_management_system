const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');
const User = require('../models/user');

class AuthService {
  /**
   * Generates a JWT token for a user
   */
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        role: user.role,
        school_id: user.school_id,
        garrison_id: user.garrison_id,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }

  /**
   * Checks if a token is in the Redis blacklist
   */
  async isTokenBlacklisted(token) {
    try {
      if (!redisClient.isReady) return false;
      const res = await redisClient.get(`blacklist:${token}`);
      return res !== null;
    } catch (error) {
      logger.error('Redis Blacklist Check Error: ' + error.message);
      return false;
    }
  }

  /**
   * Adds a token to the Redis blacklist
   */
  async blacklistToken(token) {
    try {
      if (!redisClient.isReady) return;
      const decoded = jwt.decode(token);
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redisClient.set(`blacklist:${token}`, 'true', { EX: ttl });
        }
      }
    } catch (error) {
      logger.error('Error blacklisting token: ' + error.message);
    }
  }

  /**
   * Authenticate a user
   */
  async login(username, password) {
    const [results] = await db.query(`
      SELECT users.*, roles.name AS role, garrisons.name AS garrison_name, schools.name AS school_name
      FROM users
      JOIN roles ON users.role_id = roles.id
      LEFT JOIN garrisons ON users.garrison_id = garrisons.id
      LEFT JOIN schools ON users.school_id = schools.id
      WHERE users.username = ? OR users.email = ?
    `, [username, username]);

    if (!results.length) {
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      throw error;
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      throw error;
    }

    const token = this.generateToken(user);
    return {
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role,
        role_id: user.role_id,
        school_id: user.school_id,
        garrison_id: user.garrison_id,
        garrison_name: user.garrison_name,
        school_name: user.school_name
      }
    };
  }

  /**
   * Register a new user
   */
  async register(userData) {
    const { full_name, username, password, role_id, school_id, garrison_id, email } = userData;

    const [existing] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email || null]
    );

    if (existing.length > 0) {
      const error = new Error('Username or email already registered');
      error.statusCode = 400;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = require('crypto').randomUUID();

    await db.query(`
      INSERT INTO users (id, full_name, username, email, password, role_id, school_id, garrison_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, full_name, username, email || null, hashedPassword, role_id, school_id || null, garrison_id || null]);

    return { id, success: true };
  }

  /**
   * Validate a token and return user info
   */
  async validateToken(token) {
    if (await this.isTokenBlacklisted(token)) {
      const error = new Error('Token has been invalidated');
      error.statusCode = 401;
      throw error;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [results] = await db.query(
      `SELECT users.id, users.full_name, users.username, users.email, users.role_id, users.school_id, users.garrison_id,
              roles.name AS role, garrisons.name AS garrison_name, schools.name AS school_name
       FROM users
       JOIN roles ON users.role_id = roles.id
       LEFT JOIN garrisons ON users.garrison_id = garrisons.id
       LEFT JOIN schools ON users.school_id = schools.id
       WHERE users.id = ?`,
      [decoded.id]
    );

    if (!results.length) {
      await this.blacklistToken(token);
      const error = new Error('User not found');
      error.statusCode = 401;
      throw error;
    }

    const u = results[0];
    return {
      id: u.id,
      full_name: u.full_name,
      username: u.username,
      email: u.email,
      role: u.role,
      role_id: u.role_id,
      school_id: u.school_id,
      garrison_id: u.garrison_id,
      garrison_name: u.garrison_name,
      school_name: u.school_name
    };
  }

  /**
   * Change user password
   */
  async changePassword(username, currentPassword, newPassword) {
    const user = await User.findByUsername(username);

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      const error = new Error('Current password is incorrect');
      error.statusCode = 401;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.update(user.id, { password: hashedPassword });

    return { success: true };
  }
}

module.exports = new AuthService();
