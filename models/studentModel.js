const db = require('../config/db');

const buildScopedWhere = (scope, includeBranch = true) => {
  const params = [scope.tenantId, scope.schoolId];
  let whereSql = 'tenant_id = ? AND school_id = ?';
  if (includeBranch && scope.branchId) {
    whereSql += ' AND branch_id = ?';
    params.push(scope.branchId);
  }
  return { whereSql, params };
};

const Student = {
  async getAll(scope) {
    const { whereSql, params } = buildScopedWhere(scope);
    const [rows] = await db.query(`SELECT * FROM students WHERE ${whereSql}`, params);
    return rows;
  },

  async getById(id, scope) {
    const { whereSql, params } = buildScopedWhere(scope);
    const [rows] = await db.query(`SELECT * FROM students WHERE id = ? AND ${whereSql}`, [id, ...params]);
    return rows;
  },

  async create(studentData, scope) {
    const payload = {
      ...studentData,
      tenant_id: scope.tenantId,
      school_id: scope.schoolId,
      branch_id: scope.branchId ?? null,
    };
    const [result] = await db.query('INSERT INTO students SET ?', [payload]);
    return result;
  },

  async update(id, studentData, scope) {
    const payload = {
      ...studentData,
      tenant_id: scope.tenantId,
      school_id: scope.schoolId,
      branch_id: scope.branchId ?? null,
    };
    const { whereSql, params } = buildScopedWhere(scope);
    const [result] = await db.query(`UPDATE students SET ? WHERE id = ? AND ${whereSql}`, [payload, id, ...params]);
    return result;
  },

  async delete(id, scope) {
    const { whereSql, params } = buildScopedWhere(scope);
    const [result] = await db.query(`DELETE FROM students WHERE id = ? AND ${whereSql}`, [id, ...params]);
    return result;
  },

  async promote(id, scope) {
    const { whereSql, params } = buildScopedWhere(scope);
    const [result] = await db.query(
      `UPDATE students SET class_id = class_id + 1 WHERE id = ? AND ${whereSql}`,
      [id, ...params]
    );
    return result;
  },

  async transfer(id, newSchoolId, newClassId, scope) {
    const [classRows] = await db.query(
      'SELECT id, school_id, branch_id FROM classes WHERE id = ? AND school_id = ? AND tenant_id = ? LIMIT 1',
      [newClassId, newSchoolId, scope.tenantId]
    );
    if (!classRows.length) {
      return { affectedRows: 0 };
    }

    const classRow = classRows[0];
    const { whereSql, params } = buildScopedWhere(scope);
    const [result] = await db.query(
      `UPDATE students
       SET school_id = ?, class_id = ?, branch_id = ?
       WHERE id = ? AND ${whereSql}`,
      [newSchoolId, newClassId, classRow.branch_id ?? scope.branchId ?? null, id, ...params]
    );
    return result;
  }
};

module.exports = Student;