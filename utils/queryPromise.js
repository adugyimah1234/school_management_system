const db = require('../config/db');

function query(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

module.exports = query;
// This function can be used in your controllers to execute SQL queries
// Example usage in a controller: