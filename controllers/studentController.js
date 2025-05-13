const Student = require('../models/studentModel');
const db = require('../config/db'); // your mysql db connection

exports.getAllStudents = (req, res) => {
  Student.getAll((err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.getStudent = (req, res) => {
  const { id } = req.params;
  Student.getById(id, (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ message: "Student not found" });
    res.json(result[0]);
  });
};

exports.createStudent = (req, res) => {
  const studentData = req.body;
  Student.create(studentData, (err, result) => {
    if (err) return res.status(500).json(err);
    res.status(201).json({ id: result.insertId, ...studentData });
  });
};

exports.deleteStudent = (req, res) => {
  const { id } = req.params;
  Student.delete(id, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Student deleted" });
  });
};
