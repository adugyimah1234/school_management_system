const gradebookService = require("../services/gradebookService");
const response = require("../utils/apiResponse");

exports.getSubjects = async (req, res, next) => {
    try {
        const subjects = await gradebookService.getAllSubjects(req.user);
        return response.success(res, subjects);
    } catch (err) {
        next(err);
    }
};

exports.createSubject = async (req, res, next) => {
    try {
        const subject = await gradebookService.createSubject(req.body, req.user);
        return response.success(res, subject, "Subject created successfully", 201);
    } catch (err) {
        next(err);
    }
};

exports.deleteSubject = async (req, res, next) => {
    try {
        await gradebookService.deleteSubject(req.params.id);
        return response.success(res, null, "Subject removed successfully");
    } catch (err) {
        next(err);
    }
};

exports.getTerms = async (req, res, next) => {
    try {
        const { academicYearId } = req.query;
        const terms = await gradebookService.getTerms(academicYearId);
        return response.success(res, terms);
    } catch (err) {
        next(err);
    }
};

exports.createTerm = async (req, res, next) => {
    try {
        const term = await gradebookService.createTerm(req.body);
        return response.success(res, term, "Academic term created successfully", 201);
    } catch (err) {
        next(err);
    }
};

exports.deleteTerm = async (req, res, next) => {
    try {
        await gradebookService.deleteTerm(req.params.id);
        return response.success(res, null, "Academic term removed successfully");
    } catch (err) {
        next(err);
    }
};

exports.getClassMarks = async (req, res, next) => {
    try {
        const { classId, termId, subjectId } = req.query;
        const marks = await gradebookService.getMarksByClass(classId, termId, subjectId);
        return response.success(res, marks);
    } catch (err) {
        next(err);
    }
};

exports.saveMarks = async (req, res, next) => {
    try {
        // Handle bulk or single
        if (Array.isArray(req.body.marks)) {
            for (const entry of req.body.marks) {
                await gradebookService.saveMarks({
                    ...entry,
                    subject_id: req.body.subject_id,
                    term_id: req.body.term_id
                }, req.user);
            }
        } else {
            await gradebookService.saveMarks(req.body, req.user);
        }
        return response.success(res, null, "Marks synchronized successfully");
    } catch (err) {
        next(err);
    }
};

exports.getReportCard = async (req, res, next) => {
    try {
        const { studentId, termId } = req.params;
        const report = await gradebookService.getStudentReport(studentId, termId);
        return response.success(res, report);
    } catch (err) {
        next(err);
    }
};

exports.broadcastResults = async (req, res, next) => {
    try {
        const { student_id, term_id, class_id, type } = req.body;
        const commService = require('../services/communicationService');

        if (type === 'achievement') {
            const result = await gradebookService.broadcastAchievementAlerts(term_id, class_id, req.user);
            return response.success(res, result, "Achievement alerts transmitted");
        }

        if (student_id) {
            // Single student broadcast
            const report = await gradebookService.getStudentReport(student_id, term_id);
            if (!report.student.guardian_phone_number) throw new Error("No guardian contact found");

            const msg = `GARRISON SMS: ${report.student.first_name} ${report.student.last_name}, ${report.term.name} Results. POS: ${report.stats.position}/${report.stats.class_size}. AGG: ${report.stats.aggregate_score}. Contact school for full report.`;
            await commService.sendSMS(report.student.guardian_phone_number, msg);
        } else if (class_id) {
            // Bulk class broadcast
            const [students] = await require('../config/db').query("SELECT id FROM students WHERE class_id = ? AND status = 'active'", [class_id]);
            for (const s of students) {
                try {
                    const report = await gradebookService.getStudentReport(s.id, term_id);
                    if (report.student.guardian_phone_number) {
                        const msg = `GARRISON SMS: ${report.student.first_name} ${report.student.last_name}, ${report.term.name} Results. POS: ${report.stats.position}/${report.stats.class_size}. AGG: ${report.stats.aggregate_score}.`;
                        await commService.sendSMS(report.student.guardian_phone_number, msg);
                    }
                } catch (e) { /* skip failures */ }
            }
        }

        return response.success(res, null, "Results broadcast initiated");
    } catch (err) {
        next(err);
    }
};
