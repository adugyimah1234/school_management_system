const Role = require('../models/role.model');

exports.getAllRoles = (req, res) => {
  Role.getAll((err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

exports.getRoleById = (req, res) => {
  const id = req.params.id;
  Role.getById(id, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'Role not found' });
    res.json(results[0]);
  });
};

exports.createRole = (req, res) => {
  const role = req.body;
  Role.create(role, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.insertId, ...role });
  });
};

exports.updateRole = (req, res) => {
  const id = req.params.id;
  const role = req.body;
  Role.update(id, role, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Role updated successfully' });
  });
};

exports.deleteRole = (req, res) => {
  const id = req.params.id;
  Role.delete(id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Role deleted successfully' });
  });
};
