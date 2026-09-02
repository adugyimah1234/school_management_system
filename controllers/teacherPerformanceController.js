const attendanceService = require("../services/teacherAttendanceService");
const response = require("../utils/apiResponse");

exports.checkIn = async (req, res, next) => {
    try {
        const result = await attendanceService.checkIn(req.user, req.body.notes);
        return response.success(res, result, "Check-in protocol verified");
    } catch (err) {
        next(err);
    }
};

exports.checkOut = async (req, res, next) => {
    try {
        const result = await attendanceService.checkOut(req.user);
        return response.success(res, result, "Check-out finalized");
    } catch (err) {
        next(err);
    }
};

exports.getRegistry = async (req, res, next) => {
    try {
        const registry = await attendanceService.getAttendanceRegistry(req.user, req.query);
        return response.success(res, registry);
    } catch (err) {
        next(err);
    }
};

exports.getStaffStats = async (req, res, next) => {
    try {
        const stats = await attendanceService.getTeacherStats(req.params.userId);
        return response.success(res, stats);
    } catch (err) {
        next(err);
    }
};
