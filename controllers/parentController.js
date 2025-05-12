const Parent = require('../models/parentModel');

exports.addParent = (req, res) => {
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
