const bcrypt = require('bcryptjs');
const db = require('../config/db'); // your mysql db connection

exports.register = async (req, res) => {
  const { full_name, email, password, role_id, school_id } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  const sql = 'INSERT INTO users (full_name, email, password, role_id, school_id) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [full_name, email, hashed, role_id, school_id], (err, result) => {
    if (err) return res.status(500).json({ err });
    res.status(201).json({ message: 'User created' });
  });
};

exports.getUserById = (req, res) => {
    const userId = req.params.id;
    const sql = 'SELECT id, full_name, email, role_id, school_id FROM users WHERE id = ?'; // Select the user's information

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ message: 'Error fetching user', err });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = results[0];
        res.status(200).json({ message: 'User fetched successfully', user });
    });
};