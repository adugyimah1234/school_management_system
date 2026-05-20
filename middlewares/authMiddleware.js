const jwt = require('jsonwebtoken');
const { isTokenBlacklisted } = require('../controllers/authController');
const db = require('../config/db');
require('dotenv').config();

const parseBranchId = (req) => {
  const headerBranchId = req.headers['x-branch-id'];
  const queryBranchId = req.query?.branch_id;
  const bodyBranchId = req.body?.branch_id;
  const raw = headerBranchId ?? queryBranchId ?? bodyBranchId ?? null;
  if (raw === null || raw === undefined || raw === '') return null;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. No token provided.'
    });
  }

  const token = authHeader.split(' ')[1];

  if (isTokenBlacklisted(token)) {
    return res.status(401).json({
      success: false,
      message: 'Token has been invalidated. Please log in again.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      tenant_id: decoded.tenant_id ?? null,
      school_id: decoded.school_id ?? null,
      branch_id: decoded.branch_id ?? null,
      role_id: decoded.role_id ?? null,
    };
    req.token = token;
    next();
  } catch (err) {
    console.error('JWT error:', err);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: err.message
    });
  }
};

const loadAccessContext = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication context not found.'
      });
    }

    const [users] = await db.query(
      `SELECT u.id, u.tenant_id, u.school_id, u.branch_id, u.role_id, r.name AS role
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!users.length) {
      return res.status(401).json({
        success: false,
        message: 'User not found.'
      });
    }

    const user = users[0];
    const [branchRows] = await db.query(
      `SELECT b.id
       FROM user_branch_access uba
       INNER JOIN branches b ON b.id = uba.branch_id
       WHERE uba.user_id = ? AND b.tenant_id = ? AND b.school_id = ?`,
      [user.id, user.tenant_id, user.school_id]
    );

    req.user = {
      id: user.id,
      role: user.role || req.user.role,
      role_id: user.role_id,
      tenant_id: user.tenant_id,
      school_id: user.school_id,
      branch_id: user.branch_id,
    };

    req.scope = {
      tenantId: user.tenant_id,
      schoolId: user.school_id,
      role: user.role || req.user.role,
      defaultBranchId: user.branch_id,
      allowedBranchIds: branchRows.map((row) => row.id),
      branchId: null,
    };

    if (!req.scope.tenantId || !req.scope.schoolId) {
      return res.status(403).json({
        success: false,
        message: 'User has incomplete tenant/school access context.'
      });
    }

    next();
  } catch (error) {
    console.error('loadAccessContext error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load access context.'
    });
  }
};

const resolveBranch = ({ required = false } = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.scope) {
        return res.status(500).json({
          success: false,
          message: 'Scope context is missing.'
        });
      }

      const requestedBranchId = parseBranchId(req);
      const resolvedBranchId = requestedBranchId ?? req.scope.defaultBranchId ?? req.scope.allowedBranchIds[0] ?? null;
      const role = req.scope.role;
      const isTenantAdmin = role === 'admin';

      if (required && !resolvedBranchId) {
        return res.status(400).json({
          success: false,
          message: 'Branch context is required.'
        });
      }

      if (resolvedBranchId) {
        const [branches] = await db.query(
          `SELECT id
           FROM branches
           WHERE id = ? AND tenant_id = ? AND school_id = ?`,
          [resolvedBranchId, req.scope.tenantId, req.scope.schoolId]
        );

        if (!branches.length) {
          return res.status(403).json({
            success: false,
            message: 'Branch does not belong to current tenant/school scope.'
          });
        }

        if (!isTenantAdmin && req.scope.allowedBranchIds.length > 0 && !req.scope.allowedBranchIds.includes(resolvedBranchId)) {
          return res.status(403).json({
            success: false,
            message: 'You do not have access to this branch.'
          });
        }
      }

      req.scope.branchId = resolvedBranchId;
      next();
    } catch (error) {
      console.error('resolveBranch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to resolve branch context.'
      });
    }
  };
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const currentRole = req.scope?.role || req.user?.role;
    if (!currentRole || !roles.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for current role.'
      });
    }
    return next();
  };
};

const enforceScopeOnWrite = ({ branchRequired = false } = {}) => {
  return (req, res, next) => {
    if (!req.scope) {
      return res.status(500).json({
        success: false,
        message: 'Scope context is missing.'
      });
    }

    const payload = req.body || {};
    const mismatchedTenant = payload.tenant_id && Number(payload.tenant_id) !== Number(req.scope.tenantId);
    const mismatchedSchool = payload.school_id && Number(payload.school_id) !== Number(req.scope.schoolId);
    const mismatchedBranch = payload.branch_id && req.scope.branchId && Number(payload.branch_id) !== Number(req.scope.branchId);

    if (mismatchedTenant || mismatchedSchool || mismatchedBranch) {
      return res.status(403).json({
        success: false,
        message: 'Tenant/school/branch IDs cannot be spoofed.'
      });
    }

    if (branchRequired && !req.scope.branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch is required for this operation.'
      });
    }

    req.body = {
      ...payload,
      tenant_id: req.scope.tenantId,
      school_id: req.scope.schoolId,
      branch_id: req.scope.branchId ?? null,
    };

    next();
  };
};

const isAdmin = (req, res, next) => {
  const role = req.scope?.role || req.user?.role;
  if (role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admins only.'
    });
  }
  next();
};

const isRole = (requiredRole) => {
  return (req, res, next) => {
    const role = req.scope?.role || req.user?.role;
    if (!role || role !== requiredRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${requiredRole} role required.`
      });
    }
    next();
  };
};

exports.authenticate = authenticate;
exports.protect = authenticate;
exports.loadAccessContext = loadAccessContext;
exports.resolveBranch = resolveBranch;
exports.authorizeRoles = authorizeRoles;
exports.enforceScopeOnWrite = enforceScopeOnWrite;
exports.isAdmin = isAdmin;
exports.isRole = isRole;