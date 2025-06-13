const Student = require('../models/studentModel');

// ✅ Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.getAll();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get student by ID
exports.getStudent = async (req, res) => {
  const { id } = req.params;

  try {
    const student = await Student.getById(id);
    if (!student || student.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Create a new student
exports.createStudent = async (req, res) => {
  const studentData = req.body;

  try {
    const result = await Student.create(studentData);
    res.status(201).json({ id: result.insertId, ...studentData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete student by ID
exports.deleteStudent = async (req, res) => {
  const { id } = req.params;

  try {
    await Student.delete(id);
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
