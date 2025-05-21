const db = require('../config/db');

const Role = {
  getAll: (callback) => {
    db.query('SELECT * FROM roles', callback);
  },

  getById: (id, callback) => {
    db.query('SELECT * FROM roles WHERE id = ?', [id], callback);
  },

  create: (role, callback) => {
    db.query('INSERT INTO roles (name, description) VALUES (?, ?)', [role.name, role.description], callback);
  },

  update: (id, role, callback) => {
    db.query('UPDATE roles SET name = ?, description = ? WHERE id = ?', [role.name, role.description, id], callback);
  },

  delete: (id, callback) => {
    db.query('DELETE FROM roles WHERE id = ?', [id], callback);
  }
};

module.exports = Role;
