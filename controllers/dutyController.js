const dutyService = require("../services/dutyService");
const response = require("../utils/apiResponse");

exports.getRoster = async (req, res, next) => {
    try {
        const roster = await dutyService.getRoster(req.user, req.query);
        return response.success(res, roster);
    } catch (err) {
        next(err);
    }
};

exports.createDuty = async (req, res, next) => {
    try {
        const duty = await dutyService.createDuty(req.body, req.user);

        // Trigger Staff Notification
        try {
            const [[staff]] = await require('../config/db').query("SELECT full_name, phone_number FROM users WHERE id = ?", [req.body.user_id]);
            if (staff && staff.phone_number) {
                const commService = require('../services/communicationService');
                const msg = `GARRISON DUTY: Personnel ${staff.full_name}, you have been assigned as ${req.body.duty_type} from ${req.body.start_date} to ${req.body.end_date}. Instructions: ${req.body.remarks || 'Standard protocol.'}`;
                await commService.sendSMS(staff.phone_number, msg);
            }
        } catch (smsErr) {
            console.error("Duty SMS Notification failed:", smsErr.message);
        }

        return response.success(res, duty, "Duty assigned and personnel notified", 201);
    } catch (err) {
        next(err);
    }
};

exports.deleteDuty = async (req, res, next) => {
    try {
        await dutyService.deleteDuty(req.params.id);
        return response.success(res, null, "Duty assignment removed");
    } catch (err) {
        next(err);
    }
};

exports.broadcastRoster = async (req, res, next) => {
    try {
        const result = await dutyService.broadcastWeeklyRoster(req.user);
        return response.success(res, result, "Weekly roster broadcasted to personnel");
    } catch (err) {
        next(err);
    }
};
