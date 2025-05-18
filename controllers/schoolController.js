const db = require('../config/db');

exports.getAllSchools = async (req, res) => {
  try {
    const [schools] = await db.promise().query('SELECT * FROM schools');
    res.json(schools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createSchool = async (req, res) => {
  const { name, address, phone_number, email } = req.body;

  if (!name || !address || !phone_number || !email) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const [result] = await db.promise().query(
      'INSERT INTO schools (name, address, phone_number, email) VALUES (?, ?, ?, ?)',
      [name, address, phone_number, email]
    );
    res.status(201).json({ id: result.insertId, message: 'School created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSchool = async (req, res) => {
  const { id } = req.params;
  const { name, address, phone_number, email } = req.body;

  try {
    const [result] = await db.promise().query(
      'UPDATE schools SET name = ?, address = ?, phone_number = ?, email = ? WHERE id = ?',
      [name, address, phone_number, email, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    res.json({ message: 'School updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteSchool = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.promise().query('DELETE FROM schools WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    res.json({ message: 'School deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};