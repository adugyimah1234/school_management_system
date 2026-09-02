const db = require('../config/db');
const crypto = require('crypto');
const response = require('../utils/apiResponse');

exports.getDocuments = async (req, res, next) => {
    const { owner_id, owner_type } = req.query;
    try {
        const [docs] = await db.query(
            'SELECT * FROM school_documents WHERE owner_id = ? AND owner_type = ? ORDER BY created_at DESC',
            [owner_id, owner_type]
        );
        return response.success(res, docs);
    } catch (error) { next(error); }
};

exports.addDocument = async (req, res, next) => {
    const { owner_id, owner_type, title, file_url, file_type } = req.body;
    try {
        const id = crypto.randomUUID();
        await db.query(
            'INSERT INTO school_documents (id, owner_id, owner_type, title, file_url, file_type) VALUES (?, ?, ?, ?, ?, ?)',
            [id, owner_id, owner_type, title, file_url, file_type || 'PDF']
        );
        return response.success(res, { id }, 'Document added');
    } catch (error) { next(error); }
};

exports.deleteDocument = async (req, res, next) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM school_documents WHERE id = ?', [id]);
        return response.success(res, null, 'Document deleted');
    } catch (error) { next(error); }
};
