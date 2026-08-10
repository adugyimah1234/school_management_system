const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { authLimiter, apiLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');
const response = require('../utils/apiResponse');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and account management
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, authController.login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user account (Staff/Admin)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - username
 *               - password
 *               - role
 *               - school_id
 *             properties:
 *               full_name:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *               school_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered
 */
router.post('/register', apiLimiter, authController.register);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user and invalidate token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', protect, authController.logout);

/**
 * @swagger
 * /api/auth/validate:
 *   get:
 *     summary: Validate current JWT token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 */
router.get('/validate', apiLimiter, authController.validateToken);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get currently logged in user details
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 */
router.get('/me', protect, apiLimiter, (req, res) => {
  return response.success(res, req.user, 'User profile fetched successfully');
});

module.exports = router;