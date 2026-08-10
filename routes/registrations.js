const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middlewares/authMiddleware");
const { registrationRules, validate } = require("../middlewares/validationMiddleware");
const { apiLimiter } = require("../middleware/rateLimiter");
const registrationController = require("../controllers/registrationController");

/**
 * Professional Lean Routes
 * Logic has been moved to controllers/registrationController.js
 */

// Apply API Limiter to all registration routes
router.use(apiLimiter);

/**
 * @swagger
 * tags:
 *   name: Registrations
 *   description: Student admission registration management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Registration:
 *       type: object
 *       required:
 *         - first_name
 *         - last_name
 *         - category
 *         - date_of_birth
 *         - class_applying_for
 *         - gender
 *         - address
 *         - guardian_name
 *         - relationship
 *         - guardian_phone_number
 *         - academic_year_id
 *       properties:
 *         first_name:
 *           type: string
 *         middle_name:
 *           type: string
 *         last_name:
 *           type: string
 *         category:
 *           type: string
 *         date_of_birth:
 *           type: string
 *           format: date
 *         class_applying_for:
 *           type: string
 *         gender:
 *           type: string
 *           enum: [Male, Female, Other]
 *         email:
 *           type: string
 *         phone_number:
 *           type: string
 *         address:
 *           type: string
 *         previous_school:
 *           type: string
 *         guardian_name:
 *           type: string
 *         relationship:
 *           type: string
 *         guardian_phone_number:
 *           type: string
 *         academic_year_id:
 *           type: string
 */

/**
 * @swagger
 * /api/registrations:
 *   get:
 *     summary: Get all registrations
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all registrations
 */
router.get("/", protect, registrationController.getAllRegistrations);

/**
 * @swagger
 * /api/registrations/create:
 *   post:
 *     summary: Create a new student registration
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Registration'
 *     responses:
 *       201:
 *         description: Registration created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/create",
  protect,
  registrationRules(),
  validate,
  registrationController.createRegistration
);

/**
 * @swagger
 * /api/registrations/{id}:
 *   get:
 *     summary: Get registration by ID
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Registration UUID
 *     responses:
 *       200:
 *         description: Registration details
 *       404:
 *         description: Not found
 */
router.get("/:id", protect, registrationController.getRegistrationById);

/**
 * @swagger
 * /api/registrations/{id}/payment-status:
 *   patch:
 *     summary: Update payment status to paid
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/payment-status', protect, isAdmin, registrationController.updatePaymentStatus);

/**
 * @swagger
 * /api/registrations/{id}:
 *   put:
 *     summary: Update full registration details
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Registration'
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.put(
  "/:id",
  protect,
  isAdmin,
  registrationRules(),
  validate,
  registrationController.updateRegistration
);

router.patch(
  "/:id",
  protect,
  isAdmin,
  registrationController.updateRegistration
);

/**
 * @swagger
 * /api/registrations/{id}:
 *   delete:
 *     summary: Delete a registration
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete("/:id", protect, isAdmin, registrationController.deleteRegistration);

module.exports = router;
