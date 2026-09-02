const remarksService = require("../services/remarksService");
const response = require("../utils/apiResponse");

exports.getRemarks = async (req, res, next) => {
    try {
        const remarks = await remarksService.getAllRemarks(req.user);
        return response.success(res, remarks);
    } catch (err) {
        next(err);
    }
};

exports.createRemark = async (req, res, next) => {
    try {
        const remark = await remarksService.createRemark(req.body, req.user);
        return response.success(res, remark, "Remark added to bank", 201);
    } catch (err) {
        next(err);
    }
};

exports.deleteRemark = async (req, res, next) => {
    try {
        await remarksService.deleteRemark(req.params.id);
        return response.success(res, null, "Remark purged");
    } catch (err) {
        next(err);
    }
};
