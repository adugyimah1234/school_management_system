const Exam = require('../models/examModel');

// ✅ Get all exams
exports.getAllExams = async (req, res) => {
  try {
    const exams = await Exam.getAll();
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get exam by ID
exports.getExamById = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.getById(id);

    if (!exam || exam.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    res.json(exam[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Create exam
exports.createExam = async (req, res) => {
  try {
    const result = await Exam.create(req.body);
    res.status(201).json({ message: 'Exam created', insertId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Update exam
exports.updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    await Exam.update(id, req.body);
    res.json({ message: 'Exam updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete exam
exports.deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    await Exam.delete(id);
    res.json({ message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
