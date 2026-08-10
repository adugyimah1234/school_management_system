const { body, validationResult } = require('express-validator');

/**
 * Middleware to check for validation errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

  return res.status(422).json({
    success: false,
    message: "Validation failed",
    errors: extractedErrors,
  });
};

/**
 * Registration Validation Rules
 */
const registrationRules = () => {
  return [
    body('first_name').trim().notEmpty().withMessage('First name is required').escape(),
    body('last_name').trim().notEmpty().withMessage('Last name is required').escape(),
    body('category').trim().notEmpty().withMessage('Category is required').escape(),
    body('date_of_birth').isISO8601().withMessage('Invalid date of birth format (YYYY-MM-DD)'),
    body('class_applying_for').trim().notEmpty().withMessage('Class is required').escape(),
    body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('phone_number').optional({ checkFalsy: true }).isString().trim().escape(),
    body('address').trim().notEmpty().withMessage('Address is required').escape(),
    body('previous_school').optional({ checkFalsy: true }).trim().escape(),
    body('guardian_name').trim().notEmpty().withMessage('Guardian name is required').escape(),
    body('relationship').trim().notEmpty().withMessage('Relationship is required').escape(),
    body('guardian_phone_number').trim().notEmpty().withMessage('Guardian phone number is required').escape(),
    body('academic_year_id').trim().notEmpty().withMessage('Academic Year ID is required').escape(),
  ];
};

module.exports = {
  validate,
  registrationRules,
};
