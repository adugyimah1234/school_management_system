const db = require("../config/db");
const crypto = require("crypto");
const response = require("../utils/apiResponse");

exports.getStudentLogs = async (req, res, next) => {
    try {
        const { studentId } = req.params;
        const [rows] = await db.query(`
            SELECT d.*, u.full_name as recorded_by_name
            FROM discipline_logs d
            LEFT JOIN users u ON d.recorded_by = u.id
            WHERE d.student_id = ?
            ORDER BY d.date_occurred DESC
        `, [studentId]);
        return response.success(res, rows);
    } catch (err) {
        next(err);
    }
};

exports.createLog = async (req, res, next) => {
    try {
        const id = crypto.randomUUID();
        const data = {
            id,
            ...req.body,
            recorded_by: req.user.id
        };
        await db.query("INSERT INTO discipline_logs SET ?", [data]);
        return response.success(res, data, "Disciplinary record updated", 201);
    } catch (err) {
        next(err);
    }
};
