const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { protect } = require("../middlewares/authMiddleware"); // Add this line

// Get all registrations
router.get("/", protect, (req, res) => {
  db.query("SELECT * FROM registrations", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Register a student
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
    status = 'pending' // Add default status
  } = req.body;

  if (
    !academic_year_id ||
    !first_name ||
    !last_name ||
    !category ||
    !date_of_birth ||
    !class_applying_for ||
    !gender ||
    !address ||
    !guardian_name ||
    !relationship ||
    !guardian_phone_number
  ) {
    return res
      .status(400)
      .json({ error: "All required fields must be provided." });
  }

  try {
    // Check if the academic year exists
    const [academicYearResults] = await db
      .promise()
      .query("SELECT COUNT(*) AS count FROM academic_years WHERE id = ?", [
        academic_year_id,
      ]);
    const academicYearExists = academicYearResults[0].count > 0;

    if (!academicYearExists) {
      return res
        .status(400)
        .json({
          error:
            "Invalid academic_year_id. Please select a valid academic year.",
        });
    }

    const [result] = await db
      .promise()
      .query(
        "INSERT INTO registrations (first_name, middle_name, last_name, category, date_of_birth, class_applying_for, gender, email, phone_number, address, guardian_name, relationship, guardian_phone_number, academic_year_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
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
          status
        ]
      );

    res.status(201).json({ id: result.insertId, status });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get a single registration by ID
router.get("/:id", protect, (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM registrations WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Registration not found." });
    res.json(results[0]);
  });
});

// Update a registration by ID
router.put("/:id", protect, async (req, res) => { // Add protect middleware
  const { id } = req.params;
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
  } = req.body;

  // Check if user is admin
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admins can update registrations." });
  }

  if (
    !academic_year_id ||
    !first_name ||
    !last_name ||
    !category ||
    !date_of_birth ||
    !class_applying_for ||
    !gender ||
    !phone_number ||
    !address ||
    !guardian_name ||
    !relationship ||
    !guardian_phone_number
  ) {
    return res.status(400).json({ error: "All required fields must be provided." });
  }

  try {
    // Check academic year validity
    const [academicYearResults] = await db
      .promise()
      .query("SELECT COUNT(*) AS count FROM academic_years WHERE id = ?", [
        academic_year_id,
      ]);
    if (academicYearResults[0].count === 0) {
      return res.status(400).json({ error: "Invalid academic_year_id." });
    }

    const [result] = await db.promise().query(
      `UPDATE registrations 
       SET first_name=?, middle_name=?, last_name=?, category=?, date_of_birth=?, class_applying_for=?, gender=?, email=?, phone_number=?, address=?, guardian_name=?, relationship=?, guardian_phone_number=?, academic_year_id=? 
       WHERE id = ?`,
      [
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
        id,
      ]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: "Registration not found." });

    res.json({ message: "Registration updated successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", protect, async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  // Only admin can update
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admins can update registrations." });
  }

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: "No fields provided for update." });
  }

  // Validate academic_year_id if provided
  if (fields.academic_year_id) {
    const [academicYearResults] = await db
      .promise()
      .query("SELECT COUNT(*) AS count FROM academic_years WHERE id = ?", [
        fields.academic_year_id,
      ]);
    if (academicYearResults[0].count === 0) {
      return res.status(400).json({ error: "Invalid academic_year_id." });
    }
  }

  // Build dynamic SET clause
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClause = keys.map(key => `${key} = ?`).join(", ");

  try {
    const [result] = await db
      .promise()
      .query(
        `UPDATE registrations SET ${setClause} WHERE id = ?`,
        [...values, id]
      );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Registration not found." });
    }

    res.json({ message: "Registration updated successfully.", updatedFields: fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new route to update registration status (admin only)
router.patch("/:id/status", protect, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Check if user is admin
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admins can update registration status." });
  }

  // Validate status
  if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be 'pending', 'approved', or 'rejected'" });
  }

  try {
    const [result] = await db
      .promise()
      .query(
        "UPDATE registrations SET status = ? WHERE id = ?",
        [status, id]
      );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Registration not found." });
    }

    res.json({ message: "Registration status updated successfully.", status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a registration by ID
router.delete("/:id", protect, (req, res) => { // Add protect middleware
  const { id } = req.params;

  // Check if user is admin
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admins can delete registrations." });
  }

  db.query("DELETE FROM registrations WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Registration not found." });
    res.json({ message: "Registration deleted successfully." });
  });
});

module.exports = router;
