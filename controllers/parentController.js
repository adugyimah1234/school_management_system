const parentService = require('../services/parentService');
const response = require('../utils/apiResponse');

exports.getAllParents = async (req, res, next) => {
    try {
        const parents = await parentService.getAllParents(req.user);
        return response.success(res, parents);
    } catch (err) {
        next(err);
    }
};

exports.getParentDashboard = async (req, res, next) => {
    try {
        const { phone } = req.params;
        const data = await parentService.getParentDashboard(phone, req.user);
        return response.success(res, data);
    } catch (err) {
        next(err);
    }
};

exports.broadcastFamilyStatus = async (req, res, next) => {
    try {
        const { phone } = req.params;
        const result = await parentService.broadcastFamilyStatus(phone, req.user);
        return response.success(res, result, "Family status broadcasted");
    } catch (err) {
        next(err);
    }
};

exports.addParent = (req, res) => {
// ... existing code ...
  const parentData = req.body;
  Parent.create(parentData, (err, result) => {
    if (err) return res.status(500).json(err);
    res.status(201).json({ id: result.insertId, ...parentData });
  });
};

exports.getParentByStudent = (req, res) => {
  const { studentId } = req.params;
  Parent.getByStudentId(studentId, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};
