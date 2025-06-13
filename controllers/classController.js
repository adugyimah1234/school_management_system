const db = require('../config/db');

// ✅ Get all classes
exports.getAllClasses = async (req, res) => {
  try {
    const [classes] = await db.query('SELECT * FROM classes');
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get class by ID
exports.getClassById = async (req, res) => {
  const { id } = req.params;

  try {
    const [classes] = await db.query('SELECT * FROM classes WHERE id = ?', [id]);
    if (classes.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json(classes[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Create new class
exports.createClass = async (req, res) => {
  const { school_id, name, level } = req.body;

  if (!school_id || !name || !level) {
    return res.status(400).json({ 
      error: "Please provide all required fields: school_id, name, level" 
    });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO classes (school_id, name, level) VALUES (?, ?, ?)',
      [school_id, name, level]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Class created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Update class
exports.updateClass = async (req, res) => {
  const { id } = req.params;
  const { school_id, name, level } = req.body;

  if (!school_id || !name || !level) {
    return res.status(400).json({ 
      error: "Please provide all required fields: school_id, name, level" 
    });
  }

  try {
    const [result] = await db.query(
      'UPDATE classes SET school_id = ?, name = ?, level = ? WHERE id = ?',
      [school_id, name, level, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ message: 'Class updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Delete class
exports.deleteClass = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM classes WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
