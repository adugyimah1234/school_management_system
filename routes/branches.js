const express = require('express');
const router = express.Router();
const db = require('../config/db');
const {
  protect,
  loadAccessContext,
  resolveBranch,
  enforceScopeOnWrite,
  authorizeRoles
} = require('../middlewares/authMiddleware');

router.use(protect, loadAccessContext, resolveBranch());

// Get all branches in current tenant/school
router.get('/', async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT * FROM branches
       WHERE tenant_id = ? AND school_id = ?
       ORDER BY is_main DESC, name ASC`,
      [req.scope.tenantId, req.scope.schoolId]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new branch
router.post(
  '/',
  authorizeRoles('admin'),
  enforceScopeOnWrite({ branchRequired: false }),
  async (req, res) => {
    const { code, name, address, phone_number, email, is_main = 0, status = 'active' } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'code and name are required' });
    }

    try {
      const [result] = await db.query(
        `INSERT INTO branches
        (tenant_id, school_id, code, name, address, phone_number, email, is_main, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.scope.tenantId,
          req.scope.schoolId,
          code,
          name,
          address || null,
          phone_number || null,
          email || null,
          is_main ? 1 : 0,
          status
        ]
      );
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put(
  '/:id',
  authorizeRoles('admin'),
  enforceScopeOnWrite({ branchRequired: false }),
  async (req, res) => {
    const { id } = req.params;
    const { code, name, address, phone_number, email, is_main, status } = req.body;
    try {
      const [result] = await db.query(
        `UPDATE branches
         SET code = COALESCE(?, code),
             name = COALESCE(?, name),
             address = COALESCE(?, address),
             phone_number = COALESCE(?, phone_number),
             email = COALESCE(?, email),
             is_main = COALESCE(?, is_main),
             status = COALESCE(?, status)
         WHERE id = ? AND tenant_id = ? AND school_id = ?`,
        [
          code ?? null,
          name ?? null,
          address ?? null,
          phone_number ?? null,
          email ?? null,
          is_main ?? null,
          status ?? null,
          id,
          req.scope.tenantId,
          req.scope.schoolId
        ]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Branch not found in current scope' });
      }
      res.json({ message: 'Branch updated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete('/:id', authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(
      'DELETE FROM branches WHERE id = ? AND tenant_id = ? AND school_id = ?',
      [id, req.scope.tenantId, req.scope.schoolId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Branch not found in current scope' });
    }
    res.json({ message: 'Branch deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;