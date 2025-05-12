const db = require('../config/db');

const Fee = {
  getFee: (category, classLevel, callback) => {
    db.query('SELECT * FROM fees WHERE category = ? AND class_level = ?', [category, classLevel], callback);
  },
  getAll: callback => {
    db.query('SELECT * FROM fees', callback);
  },
  create: (data, callback) => {
    db.query('INSERT INTO fees SET ?', data, callback);
  }
};

module.exports = Fee;
