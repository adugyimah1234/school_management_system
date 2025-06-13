const Role = require('../models/role.model');

exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.getAll();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    const id = req.params.id;
    const role = await Role.getById(id);
    if (!role || role.length === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(role[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createRole = async (req, res) => {
  try {
    const role = req.body;
    const result = await Role.create(role);
    res.status(201).json({ id: result.insertId, ...role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const id = req.params.id;
    const role = req.body;
    await Role.update(id, role);
    res.json({ message: 'Role updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const id = req.params.id;
    await Role.delete(id);
    res.json({ message: 'Role deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
