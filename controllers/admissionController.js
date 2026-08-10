const admissionService = require("../services/admissionService");
const response = require("../utils/apiResponse");

/**
 * Bulk Admission Controller
 */
exports.bulkAdmit = async (req, res, next) => {
    try {
        const results = await admissionService.bulkAdmit(req.body, req.user);
        return response.success(res, results, "Bulk admission process completed");
    } catch (err) {
        next(err);
    }
};

/**
 * Legacy Support
 */
const Admission = require('../models/admissionModel');

exports.createAdmission = (req, res) => {
  const data = req.body;
  Admission.create(data, (err, result) => {
    if (err) return res.status(500).json({ message: 'Error creating admission', error: err });
    res.status(201).json({ message: 'Admission created successfully', data: result });
  });
};

exports.getAdmissionsByStudent = (req, res) => {
  const studentId = req.params.id;
  Admission.getByStudentId(studentId, (err, result) => {
    if (err) return res.status(500).json({ message: 'Error fetching admissions', error: err });
    res.json(result);
  });
};
