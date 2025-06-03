const Exam = require('../models/examModel');

exports.getAllExams = (req, res) => {
  Exam.getAll((err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

exports.getExamById = (req, res) => {
  const { id } = req.params;
  Exam.getById(id, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ message: 'Exam not found' });
    res.json(result[0]);
  });
};

exports.createExam = (req, res) => {
  Exam.create(req.body, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Exam created', insertId: result.insertId });
  });
};

exports.updateExam = (req, res) => {
  const { id } = req.params;
  Exam.update(id, req.body, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Exam updated' });
  });
};

exports.deleteExam = (req, res) => {
  const { id } = req.params;
  Exam.delete(id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Exam deleted' });
  });
};
