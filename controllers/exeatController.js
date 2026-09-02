const exeatService = require("../services/exeatService");
const response = require("../utils/apiResponse");

exports.getAllExeats = async (req, res, next) => {
    try {
        const exeats = await exeatService.getAllExeats(req.user, req.query);
        return response.success(res, exeats);
    } catch (err) {
        next(err);
    }
};

exports.createExeat = async (req, res, next) => {
    try {
        const exeat = await exeatService.createExeat(req.body, req.user);
        return response.success(res, exeat, "Exeat issued successfully", 201);
    } catch (err) {
        next(err);
    }
};

exports.updateStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        await exeatService.updateStatus(req.params.id, status, req.user);
        return response.success(res, null, "Exeat status updated");
    } catch (err) {
        next(err);
    }
};

exports.deleteExeat = async (req, res, next) => {
    try {
        await exeatService.deleteExeat(req.params.id);
        return response.success(res, null, "Exeat record removed");
    } catch (err) {
        next(err);
    }
};
