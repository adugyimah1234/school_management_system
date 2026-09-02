const Assessment = require('../models/assessmentModel');

// ✅ Get all assessments
exports.getAllAssessments = async (req, res) => {
  try {
    const user = req.user;
    const filter = {};

    const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');

    // Super admins see everything. Others are scoped by Garrison.
    if (normalizedRole !== 'superadmin') {
      if (user.garrison_id) {
        filter.garrison_id = user.garrison_id;
      }

      // School admins are scoped further, but hierarchical (Garrison + School)
      if (normalizedRole === 'schooladmin' || user.school_id) {
        filter.school_id = user.school_id;
      }
    }

    const assessments = await Assessment.getAll(filter);
    res.json(assessments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get assessment by ID
exports.getAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await Assessment.getById(id);

    if (!assessment || assessment.length === 0) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    res.json(assessment[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Create assessment
exports.createAssessment = async (req, res) => {
  try {
    const result = await Assessment.create(req.body, req.user);
    res.status(201).json({ message: 'Assessment created', insertId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Update assessment
exports.updateAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Permission check: Fetch existing to verify garrison ownership
    const existing = await Assessment.getById(id);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');
    if (normalizedRole !== 'superadmin') {
      if (existing[0].garrison_id !== user.garrison_id) {
        return res.status(403).json({ message: 'Access denied: Cannot update assessments outside your garrison' });
      }

      // School admin can only update their own school's assessments
      if (normalizedRole === 'schooladmin' && existing[0].school_id !== user.school_id) {
         return res.status(403).json({ message: 'Access denied: Cannot update garrison-wide or other school assessments' });
      }
    }

    await Assessment.update(id, req.body);
    res.json({ message: 'Assessment updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete assessment
exports.deleteAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Permission check: Fetch existing to verify garrison ownership
    const existing = await Assessment.getById(id);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');
    if (normalizedRole !== 'superadmin') {
      if (existing[0].garrison_id !== user.garrison_id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // School admin can only delete their own school's assessments
      if (normalizedRole === 'schooladmin' && existing[0].school_id !== user.school_id) {
         return res.status(403).json({ message: 'Access denied' });
      }
    }

    await Assessment.delete(id);
    res.json({ message: 'Assessment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
