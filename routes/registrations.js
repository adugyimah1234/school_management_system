const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { protect } = require("../middlewares/authMiddleware");

// Utility to check admin role
const isAdmin = (req) => req.user?.role === "admin";

// ✅ Get all registrations
router.get("/", protect, async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM registrations");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Create a registration
router.post("/create", protect, async (req, res) => {
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
    guardian_name,
    relationship,
    guardian_phone_number,
    academic_year_id,
    status = "pending"
  } = req.body;

  if (
    !first_name || !last_name || !category || !date_of_birth || !class_applying_for ||
    !gender || !address || !guardian_name || !relationship || !guardian_phone_number || !academic_year_id
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
      (first_name, middle_name, last_name, category, date_of_birth, class_applying_for, gender, email, phone_number, address, guardian_name, relationship, guardian_phone_number, academic_year_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        first_name, middle_name, last_name, category, date_of_birth,
        class_applying_for, gender, email, phone_number, address,
        guardian_name, relationship, guardian_phone_number, academic_year_id, status
      ]
    );

    res.status(201).json({ id: result.insertId, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get registration by ID
router.get("/:id", protect, async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM registrations WHERE id = ?", [req.params.id]);
    if (results.length === 0) return res.status(404).json({ error: "Registration not found." });
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/payment-status', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.promise().query(
      'UPDATE registrations SET payment_status = ? WHERE id = ?',
      ['paid', id]
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
router.put("/:id", protect, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Only admins can update registrations." });
  }

  const { id } = req.params;
  const {
    first_name, middle_name, last_name, category, date_of_birth,
    class_applying_for, gender, email, phone_number, address,
    guardian_name, relationship, guardian_phone_number, academic_year_id
  } = req.body;

  if (
    !first_name || !last_name || !category || !date_of_birth || !class_applying_for ||
    !gender || !phone_number || !address || !guardian_name || !relationship ||
    !guardian_phone_number || !academic_year_id
  ) {
    return res.status(400).json({ error: "All required fields must be provided." });
  }

  try {
    const [result] = await db.query(`
      UPDATE registrations SET 
        first_name=?, middle_name=?, last_name=?, category=?, date_of_birth=?,
        class_applying_for=?, gender=?, email=?, phone_number=?, address=?,
        guardian_name=?, relationship=?, guardian_phone_number=?, academic_year_id=?
      WHERE id = ?`, [
        first_name, middle_name, last_name, category, date_of_birth,
        class_applying_for, gender, email, phone_number, address,
        guardian_name, relationship, guardian_phone_number, academic_year_id, id
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
router.patch("/:id", protect, async (req, res) => {
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
      `UPDATE registrations SET ${fields} WHERE id = ?`,
      values
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
router.patch("/:id/status", protect, async (req, res) => {
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
      "UPDATE registrations SET status = ? WHERE id = ?",
      [status, id]
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
router.delete("/:id", protect, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Only admins can delete registrations." });
  }

  try {
    const [result] = await db.query("DELETE FROM registrations WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Registration not found." });
    res.json({ message: "Registration deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
