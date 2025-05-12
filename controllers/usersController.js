const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
  const { full_name, email, password, role, school_id } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  const sql = 'INSERT INTO users (full_name, email, password, role, school_id) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [full_name, email, hashed, role, school_id], (err, result) => {
    if (err) return res.status(500).json({ err });
    res.status(201).json({ message: 'User created' });
  });
};
