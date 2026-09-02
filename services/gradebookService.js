const db = require("../config/db");
const crypto = require("crypto");
const logger = require("../utils/logger");

class GradebookService {
    // --- Subjects ---
    async getAllSubjects(user) {
        let query = "SELECT * FROM subjects";
        let params = [];
        const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');

        if (normalizedRole !== 'superadmin') {
            if (user.school_id) {
                query += " WHERE school_id = ? OR (garrison_id = ? AND school_id IS NULL)";
                params = [user.school_id, user.garrison_id];
            } else if (user.garrison_id) {
                query += " WHERE garrison_id = ?";
                params = [user.garrison_id];
            }
        }
        const [rows] = await db.query(query, params);
        return rows;
    }

    async createSubject(data, user) {
        const id = crypto.randomUUID();
        const record = {
            id,
            name: data.name,
            code: data.code,
            school_id: user.school_id,
            garrison_id: user.garrison_id
        };
        await db.query("INSERT INTO subjects SET ?", [record]);
        return record;
    }

    async deleteSubject(id) {
        await db.query("DELETE FROM subjects WHERE id = ?", [id]);
        return true;
    }

    // --- Terms ---
    async getTerms(academicYearId) {
        let query = "SELECT * FROM academic_terms";
        let params = [];
        if (academicYearId) {
            query += " WHERE academic_year_id = ?";
            params = [academicYearId];
        }
        query += " ORDER BY start_date";
        const [rows] = await db.query(query, params);
        return rows;
    }

    async createTerm(data) {
        const id = crypto.randomUUID();
        const record = {
            id,
            academic_year_id: data.academic_year_id,
            name: data.name,
            start_date: data.start_date,
            end_date: data.end_date,
            is_active: data.is_active || false
        };
        await db.query("INSERT INTO academic_terms SET ?", [record]);
        return record;
    }

    async deleteTerm(id) {
        await db.query("DELETE FROM academic_terms WHERE id = ?", [id]);
        return true;
    }

    // --- Marks ---
    async getMarksByClass(classId, termId, subjectId) {
        const query = `
            SELECT
                s.id as student_id,
                s.first_name,
                s.last_name,
                m.ca_score,
                m.exam_score,
                m.total_score,
                m.grade,
                m.teacher_remarks
            FROM students s
            LEFT JOIN student_marks m ON s.id = m.student_id AND m.term_id = ? AND m.subject_id = ?
            WHERE s.class_id = ? AND s.status = 'active'
        `;
        const [rows] = await db.query(query, [termId, subjectId, classId]);
        return rows;
    }

    async saveMarks(marksData, user) {
        const { student_id, subject_id, term_id, ca_score, exam_score } = marksData;

        // Calculate Total and Grade (based on user settings if possible, but using standard for now)
        const total = parseFloat(ca_score || 0) + parseFloat(exam_score || 0);

        let grade = 'F';
        if (total >= 80) grade = 'A';
        else if (total >= 70) grade = 'B';
        else if (total >= 60) grade = 'C';
        else if (total >= 50) grade = 'D';
        else if (total >= 40) grade = 'E';

        const id = crypto.randomUUID();
        const query = `
            INSERT INTO student_marks (id, student_id, subject_id, term_id, ca_score, exam_score, total_score, grade)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                ca_score = VALUES(ca_score),
                exam_score = VALUES(exam_score),
                total_score = VALUES(total_score),
                grade = VALUES(grade)
        `;
        await db.query(query, [id, student_id, subject_id, term_id, ca_score, exam_score, total, grade]);
        return { success: true };
    }

    async getStudentReport(studentId, termId) {
        // 1. Get Marks
        const query = `
            SELECT
                sub.name as subject_name,
                m.ca_score,
                m.exam_score,
                m.total_score,
                m.grade,
                m.teacher_remarks
            FROM student_marks m
            JOIN subjects sub ON m.subject_id = sub.id
            WHERE m.student_id = ? AND m.term_id = ?
        `;
        const [marks] = await db.query(query, [studentId, termId]);

        // 2. Calculate Position (African re-imagined core)
        const [[studentInfo]] = await db.query("SELECT class_id FROM students WHERE id = ?", [studentId]);
        if (!studentInfo) throw new Error("Student not found");
        const classId = studentInfo.class_id;

        const rankQuery = `
            SELECT
                student_id,
                SUM(total_score) as aggregate_score,
                RANK() OVER (ORDER BY SUM(total_score) DESC) as position
            FROM student_marks
            WHERE term_id = ? AND student_id IN (SELECT id FROM students WHERE class_id = ?)
            GROUP BY student_id
        `;
        const [rankings] = await db.query(rankQuery, [termId, classId]);

        const myRank = rankings.find(r => r.student_id === studentId);
        const classSize = rankings.length;

        // 3. Get Details
        const [[student]] = await db.query(`
            SELECT s.*, c.name as class_name, sch.name as school_name, g.name as garrison_name
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            LEFT JOIN schools sch ON s.school_id = sch.id
            LEFT JOIN garrisons g ON sch.garrison_id = g.id
            WHERE s.id = ?
        `, [studentId]);

        const [[term]] = await db.query("SELECT * FROM academic_terms WHERE id = ?", [termId]);

        // 5. Get Discipline Summary
        const [discipline] = await db.query(`
            SELECT offense, action_taken, severity, date_occurred
            FROM discipline_logs
            WHERE student_id = ?
            ORDER BY date_occurred DESC
            LIMIT 5
        `, [studentId]);

        // 6. Get Financial Summary (Total Cost of Schooling)
        const [fees] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total FROM fees
            WHERE (class_id = ? AND category_id = ?)
            AND (school_id = ? OR (school_id IS NULL AND garrison_id = ?))
        `, [student.class_id, student.category_id, student.school_id, student.garrison_id]);

        const [provisionFees] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) as total FROM fees
            WHERE fee_type = 'provision' AND description LIKE ?
        `, [`%${studentId}%`]);

        const [payments] = await db.query(`
            SELECT COALESCE(SUM(amount_paid), 0) as total FROM payments WHERE student_id = ?
        `, [studentId]);

        const totalObligation = parseFloat(fees[0].total) + parseFloat(provisionFees[0]?.total || 0);
        const totalPaid = parseFloat(payments[0].total);

        return {
            student,
            term,
            marks,
            discipline,
            financial: {
                total_fees: parseFloat(fees[0].total),
                provisions: parseFloat(provisionFees[0]?.total || 0),
                total_obligation: totalObligation,
                total_paid: totalPaid,
                balance: totalObligation - totalPaid
            },
            stats: {
                aggregate_score: myRank ? parseFloat(myRank.aggregate_score).toFixed(2) : 0,
                position: myRank ? myRank.position : 'N/A',
                class_size: classSize
            },
            remarks: "Calculated from aggregate scores."
        };
    }

    async broadcastAchievementAlerts(termId, classId, user) {
        const commService = require('./communicationService');

        // 1. Calculate Rankings
        const rankQuery = `
            SELECT
                student_id,
                SUM(total_score) as aggregate_score,
                RANK() OVER (ORDER BY SUM(total_score) DESC) as position
            FROM student_marks
            WHERE term_id = ? AND student_id IN (SELECT id FROM students WHERE class_id = ?)
            GROUP BY student_id
        `;
        const [rankings] = await db.query(rankQuery, [termId, classId]);

        let successCount = 0;

        for (const rank of rankings) {
            try {
                // Get Previous Position
                const [prev] = await db.query("SELECT position FROM term_summaries WHERE student_id = ? AND term_id != ? ORDER BY created_at DESC LIMIT 1", [rank.student_id, termId]);
                const prevPos = prev[0]?.position;

                // Identification
                const [[student]] = await db.query("SELECT first_name, last_name, guardian_phone_number FROM students WHERE id = ?", [rank.student_id]);
                if (!student?.guardian_phone_number) continue;

                let msg = "";
                const isTop3 = rank.position <= 3;
                const improved = prevPos && rank.position < prevPos;

                if (isTop3) {
                    const medal = rank.position === 1 ? "🥇" : rank.position === 2 ? "🥈" : "🥉";
                    msg = `GARRISON ACHIEVER: Congratulations! Your ward ${student.first_name} ${student.last_name} placed ${rank.position}${this.getSuffix(rank.position)} in class ${medal}. We celebrate this excellence!`;
                } else if (improved) {
                    msg = `GARRISON PROGRESS: Good news! ${student.first_name} has improved their class rank from ${prevPos}${this.getSuffix(prevPos)} to ${rank.position}${this.getSuffix(rank.position)}. Keep up the hard work!`;
                }

                if (msg) {
                    await commService.sendSMS(student.guardian_phone_number, msg);
                    successCount++;
                }

                // Update Term Summary for future tracking
                await db.query(`
                    INSERT INTO term_summaries (id, student_id, term_id, aggregate_score, position, previous_position)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE position = VALUES(position), previous_position = VALUES(previous_position)
                `, [crypto.randomUUID(), rank.student_id, termId, rank.aggregate_score, rank.position, prevPos || null]);

            } catch (e) { }
        }

        return { success: true, count: successCount };
    }

    getSuffix(pos) {
        if (pos === 1) return 'st';
        if (pos === 2) return 'nd';
        if (pos === 3) return 'rd';
        return 'th';
    }
}

module.exports = new GradebookService();
