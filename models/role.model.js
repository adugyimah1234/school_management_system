const db = require('../config/db');

const Role = {
  async getAll() {
    const [rows] = await db.query('SELECT * FROM roles');
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query('SELECT * FROM roles WHERE id = ?', [id]);
    return rows;
  },

  async create(role) {
    const [result] = await db.query('INSERT INTO roles SET ?', [role]);
    return result;
  },

  async update(id, role) {
    await db.query('UPDATE roles SET ? WHERE id = ?', [role, id]);
  },

  async delete(id) {
    await db.query('DELETE FROM roles WHERE id = ?', [id]);
  }
};

module.exports = Role;
