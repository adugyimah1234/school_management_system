const express = require("express");
const router = express.Router();
const db = require("../config/db");
const {
  protect,
  loadAccessContext,
  resolveBranch,
  enforceScopeOnWrite
} = require("../middlewares/authMiddleware");

// Utility to check admin role
const isAdmin = (req) => req.user?.role === "admin";
const scopedWhere = (req) => {
  const params = [req.scope.tenantId, req.scope.schoolId];
  let sql = "tenant_id = ? AND school_id = ?";
  if (req.scope.branchId) {
    sql += " AND branch_id = ?";
    params.push(req.scope.branchId);
  }
  return { sql, params };
};

router.use(protect, loadAccessContext, resolveBranch());

// ✅ Get all registrations
router.get("/", async (req, res) => {
  try {
    const scope = scopedWhere(req);
    const [results] = await db.query(`SELECT * FROM registrations WHERE ${scope.sql}`, scope.params);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Create a registration
router.post("/create", enforceScopeOnWrite({ branchRequired: false }), async (req, res) => {
  const {
    first_name,
    middle_name,
    last_name,
    category,
    date_of_birth,
    class_applying_for,
    gender,
    email,
    phone_number,
    address,
    previous_school,
    guardian_name,
    relationship,
    guardian_phone_number,
    academic_year_id,
    status = "pending"
  } = req.body;

  if (
    !first_name || !last_name || !category || !date_of_birth || !class_applying_for ||
    !gender || !address || !previous_school || !guardian_name || !relationship || !guardian_phone_number || !academic_year_id
  ) {
    return res.status(400).json({ error: "All required fields must be provided." });
  }

  try {
    const [[{ count }]] = await db.query(
      "SELECT COUNT(*) as count FROM academic_years WHERE id = ?",
      [academic_year_id]
    );

    if (count === 0) {
      return res.status(400).json({ error: "Invalid academic_year_id." });
    }

    const [result] = await db.query(`
      INSERT INTO registrations 
      (tenant_id, school_id, branch_id, first_name, middle_name, last_name, category, date_of_birth, class_applying_for, gender, email, phone_number, address, previous_school, guardian_name, relationship, guardian_phone_number, academic_year_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        req.scope.tenantId, req.scope.schoolId, req.scope.branchId ?? null,
        first_name, middle_name, last_name, category, date_of_birth,
        class_applying_for, gender, email, phone_number, address, previous_school,
        guardian_name, relationship, guardian_phone_number, academic_year_id, status
      ]
    );

    res.status(201).json({ id: result.insertId, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get registration by ID
router.get("/:id", async (req, res) => {
  try {
    const scope = scopedWhere(req);
    const [results] = await db.query(
      `SELECT * FROM registrations WHERE id = ? AND ${scope.sql}`,
      [req.params.id, ...scope.params]
    );
    if (results.length === 0) return res.status(404).json({ error: "Registration not found." });
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/payment-status', async (req, res) => {
  const { id } = req.params;

  try {
    const scope = scopedWhere(req);
    const [result] = await db.query(
      `UPDATE registrations SET payment_status = ? WHERE id = ? AND ${scope.sql}`,
      ['paid', id, ...scope.params]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    res.status(200).json({ message: 'Payment status updated to paid' });
  } catch (error) {
    console.error('Error updating payment_status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ✅ Update a registration (admin only)
router.put("/:id", enforceScopeOnWrite({ branchRequired: false }), async (req, res) => {

  const { id } = req.params;
  const {
    first_name, middle_name, last_name, category, date_of_birth,
    class_applying_for, gender, email, phone_number, address, previous_school,
    guardian_name, relationship, guardian_phone_number, academic_year_id, scores
  } = req.body;


  try {
    const [result] = await db.query(`
      UPDATE registrations SET 
        first_name=?, middle_name=?, last_name=?, category=?, date_of_birth=?,
        class_applying_for=?, gender=?, email=?, phone_number=?, address=?, previous_school=?,
        guardian_name=?, relationship=?, guardian_phone_number=?, academic_year_id=?, scores=?
      WHERE id = ? AND tenant_id = ? AND school_id = ?`, [
        first_name, middle_name, last_name, category, date_of_birth,
        class_applying_for, gender, email, phone_number, address, previous_school,
        guardian_name, relationship, guardian_phone_number, academic_year_id, scores, id, req.scope.tenantId, req.scope.schoolId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Registration not found." });
    }

    res.json({ message: "Registration updated successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Partial update (PATCH)
router.patch("/:id", enforceScopeOnWrite({ branchRequired: false }), async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Only admins can update registrations." });
  }

  const { id } = req.params;
  const updates = req.body;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No fields provided for update." });
  }

  if (updates.academic_year_id) {
    const [[{ count }]] = await db.query(
      "SELECT COUNT(*) as count FROM academic_years WHERE id = ?",
      [updates.academic_year_id]
    );
    if (count === 0) {
      return res.status(400).json({ error: "Invalid academic_year_id." });
    }
  }

  const fields = Object.keys(updates).map((key) => `${key} = ?`).join(", ");
  const values = [...Object.values(updates), id];

  try {
    const [result] = await db.query(
      `UPDATE registrations SET ${fields} WHERE id = ? AND tenant_id = ? AND school_id = ?`,
      [...values, req.scope.tenantId, req.scope.schoolId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Registration not found." });
    }

    res.json({ message: "Registration updated successfully.", updatedFields: updates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update status (admin only)
router.patch("/:id/status", async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Only admins can update registration status." });
  }

  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['pending', 'approved', 'rejected'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const [result] = await db.query(
      "UPDATE registrations SET status = ? WHERE id = ? AND tenant_id = ? AND school_id = ?",
      [status, id, req.scope.tenantId, req.scope.schoolId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Registration not found." });
    }

    res.json({ message: "Status updated successfully.", status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete registration (admin only)
router.delete("/:id", async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Only admins can delete registrations." });
  }

  try {
    const [result] = await db.query(
      "DELETE FROM registrations WHERE id = ? AND tenant_id = ? AND school_id = ?",
      [req.params.id, req.scope.tenantId, req.scope.schoolId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Registration not found." });
    res.json({ message: "Registration deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
