const registrationService = require("../services/registrationService");
const logger = require("../utils/logger");
const response = require("../utils/apiResponse");

/**
 * Professional Registration Controller
 * Delegates business logic to registrationService
 */

// ✅ Get all registrations
exports.getAllRegistrations = async (req, res, next) => {
  try {
    const results = await registrationService.getAllRegistrations(req.user);
    return response.success(res, results, "Registrations fetched successfully");
  } catch (err) {
    next(err);
  }
};

// ✅ Create a registration
exports.createRegistration = async (req, res, next) => {
  try {
    const registration = await registrationService.createRegistration(req.body, req.user);
    return response.success(res, { id: registration.id, status: registration.status }, "Registration created successfully", 201);
  } catch (err) {
    logger.error("Registration creation error: " + err.message);
    next(err);
  }
};

// ✅ Get registration by ID
exports.getRegistrationById = async (req, res, next) => {
  try {
    const registration = await registrationService.getRegistrationById(req.params.id, req.user);
    if (!registration) return response.error(res, "Registration not found", 404);
    return response.success(res, registration);
  } catch (err) {
    next(err);
  }
};

// ✅ Update payment status
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const success = await registrationService.updatePaymentStatus(
      req.params.id,
      req.user.id,
      req.user.school_id,
      req.user.garrison_id
    );

    if (!success) {
      return response.error(res, 'Registration not found', 404);
    }

    return response.success(res, null, 'Payment status updated to paid');
  } catch (err) {
    next(err);
  }
};

// ✅ Update registration
exports.updateRegistration = async (req, res, next) => {
  try {
    const success = await registrationService.updateRegistration(req.params.id, req.body, req.user);

    if (!success) {
      return response.error(res, "Registration not found", 404);
    }

    return response.success(res, null, "Registration updated successfully");
  } catch (err) {
    next(err);
  }
};

// ✅ Delete registration
exports.deleteRegistration = async (req, res, next) => {
  try {
    const success = await registrationService.deleteRegistration(req.params.id, req.user);
    if (!success) return response.error(res, "Registration not found", 404);
    return response.success(res, null, "Registration deleted successfully");
  } catch (err) {
    next(err);
  }
};
