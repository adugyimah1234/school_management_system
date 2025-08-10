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
  const studentData = req.body; // jersey_size will be included if sent from frontend
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


// 🚀 Promote student
exports.promoteStudent = async (req, res) => {
  const { id } = req.params;
  try {
    await Student.promote(id);
    res.json({ message: 'Student promoted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🚀 Transfer student
exports.transferStudent = async (req, res) => {
  const { id } = req.params;
  const { school_id, class_id } = req.body;
  try {
    await Student.transfer(id, school_id, class_id);
    res.json({ message: 'Student transferred' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// 🚀 Update student details
exports.updateStudent = async (req, res) => {
  const { id } = req.params;
  const studentData = req.body; // jersey_size will be included if sent from frontend

  try {
    const result = await Student.update(id, studentData);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Student not found." });
    }
    res.json({ message: "Student updated", ...studentData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// 🚀 Get students by class
exports.getStudentsByClass = async (req, res) => {
  const { class_id } = req.params;

  try {
    const students = await Student.getByClass(class_id);
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// 🚀 Get students by school
exports.getStudentsBySchool = async (req, res) => {
  const { school_id } = req.params;

  try {
    const students = await Student.getBySchool(school_id);
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
