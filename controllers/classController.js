const db = require('../config/db');

exports.getAllClasses = async (req, res) => {
  try {
    const [classes] = await db.promise().query('SELECT * FROM classes');
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getClassById = async (req, res) => {
  const { id } = req.params;
  try {
    const [classes] = await db.promise().query('SELECT * FROM classes WHERE id = ?', [id]);
    if (classes.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json(classes[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createClass = async (req, res) => {
  const { school_id, name, level } = req.body;

  if (!school_id || !name || !level) {
    return res.status(400).json({ 
      error: "Please provide all required fields: school_id, name, level" 
    });
  }

  try {
    const [result] = await db.promise().query(
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

exports.updateClass = async (req, res) => {
  const { id } = req.params;
  const { school_id, name, level } = req.body;

  if (!school_id || !name || !level) {
    return res.status(400).json({ 
      error: "Please provide all required fields: school_id, name, level" 
    });
  }

  try {
    const [result] = await db.promise().query(
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

exports.deleteClass = async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.promise().query('DELETE FROM classes WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};