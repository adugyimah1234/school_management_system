const ModuleAccess = require('../models/module');
const User = require('../models/user');

/**
 * Available modules in the system
 * This would typically be stored in the database, but for simplicity
 * we'll define them here
 */
const availableModules = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/',
    description: 'Main dashboard access',
    children: []
  },
  {
    id: 'registration',
    name: 'Registration',
    path: '/registration',
    description: 'Student registration management',
    children: [
      { id: 'new-registration', name: 'New Registration', path: '/registration/new', description: 'Create new student registrations' },
      { id: 'manage-applicant', name: 'Manage Applicant', path: '/registration/manage', description: 'Manage existing registrations' }
    ]
  },
  {
    id: 'exams',
    name: 'Entrance Exams',
    path: '/exams',
    description: 'Exam management',
    children: [
      { id: 'view-results', name: 'View Results', path: '/exams/results', description: 'View exam results' },
      { id: 'recordings', name: 'Recordings', path: '/exams/recordings', description: 'Manage exam recordings' },
      { id: 'shortlisted', name: 'Shortlisted', path: '/exams/shortlisted', description: 'View shortlisted candidates' }
    ]
  },
  {
    id: 'admissions',
    name: 'Admissions',
    path: '/admissions',
    description: 'Manage student admissions',
    children: [
      { id: 'admission-process', name: 'Admission Process', path: '/admissions/admission-process', description: 'Manage admission process' },
      { id: 'enrolled-students', name: 'Enrolled Students', path: '/admissions/enrolled-students', description: 'View enrolled students' }
    ]
  },
  {
    id: 'fees',
    name: 'Fees',
    path: '/fees',
    description: 'Fee management',
    children: [
      { id: 'invoices', name: 'Invoices', path: '/fees/invoices', description: 'Manage fee invoices' },
      { id: 'payment-history', name: 'Payment History', path: '/fees/payment-history', description: 'View payment history' },
      { id: 'records', name: 'Records', path: '/fees/records', description: 'Fee records' }
    ]
  },
  {
    id: 'admin',
    name: 'Administration',
    path: '/admin',
    description: 'Administrative functions',
    children: [
      { id: 'user-management', name: 'User Management', path: '/admin/user-management', description: 'Manage system users' },
      { id: 'roles', name: 'Roles', path: '/admin/roles', description: 'Manage user roles' },
      { id: 'module-access', name: 'Module Access', path: '/admin/module-access', description: 'Control module access' },
      { id: 'schools', name: 'Schools', path: '/admin/schools', description: 'Manage schools' },
      { id: 'classes', name: 'Classes', path: '/admin/classes', description: 'Manage classes' },
      { id: 'categories', name: 'Categories', path: '/admin/categories', description: 'Manage categories' },
      { id: 'fees', name: 'Fee Configuration', path: '/admin/fees', description: 'Configure fees' },
      { id: 'system-settings', name: 'System Settings', path: '/admin/system-settings', description: 'Configure system settings' }
    ]
  },
  {
    id: 'profile',
    name: 'Profile',
    path: '/profile',
    description: 'User profile management',
    children: []
  }
];

/**
 * Default module access by user role
 */
const defaultModuleAccessByRole = {
  'admin': getAllModuleIds(),
  'teacher': [
    'dashboard',
    'exams', 'view-results', 'recordings',
    'profile'
  ],
  'student': [
    'dashboard',
    'profile',
    'exams', 'view-results',
    'fees', 'invoices', 'payment-history'
  ],
  'parent': [
    'dashboard',
    'profile',
    'exams', 'view-results',
    'fees', 'invoices', 'payment-history', 'records'
  ],
  'staff': [
    'dashboard',
    'profile',
    'registration', 'new-registration', 'manage-applicant',
    'admissions', 'admission-process', 'enrolled-students',
    'fees', 'invoices', 'payment-history', 'records'
  ]
};

/**
 * Get all module IDs including children
 * @returns {string[]} Array of all module IDs
 */
function getAllModuleIds() {
  return availableModules.flatMap(module => 
    [module.id, ...(module.children?.map(child => child.id) || [])]
  );
}

/**
 * Find a module by ID
 * @param {string} moduleId - The ID of the module to find
 * @returns {Object|null} The module object or null if not found
 */
function findModuleById(moduleId) {
  for (const module of availableModules) {
    if (module.id === moduleId) {
      return module;
    }
    
    if (module.children && module.children.length > 0) {
      const childModule = module.children.find(child => child.id === moduleId);
      if (childModule) {
        return childModule;
      }
    }
  }
  
  return null;
}

/**
 * Find parent module of a child module
 * @param {string} childModuleId - The ID of the child module
 * @returns {Object|null} The parent module or null if not found
 */
function findParentModule(childModuleId) {
  for (const module of availableModules) {
    if (module.children && module.children.some(child => child.id === childModuleId)) {
      return module;
    }
  }
  
  return null;
}

/**
 * Generate a standardized API response
 * @param {boolean} success - Whether the request was successful
 * @param {any} data - The response data (null for errors)
 * @param {Object|null} error - Error details (null for success)
 * @param {Object} meta - Additional metadata
 * @returns {Object} The formatted response
 */
function formatResponse(success, data, error = null, meta = {}) {
  return {
    success,
    data,
    error,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
}

/**
 * @desc    Get all available modules
 * @route   GET /api/admin/modules
 * @access  Private/Admin
 */
const getAllModules = async (req, res) => {
  try {
    const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Return all modules
    return res.status(200).json(
      formatResponse(true, availableModules, null, { requestId })
    );
  } catch (error) {
    console.error('Error getting modules:', error);
    return res.status(500).json(
      formatResponse(false, null, {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving modules',
        status: 500,
        details: { error: error.message }
      })
    );
  }
};

/**
 * @desc    Get modules for a specific role
 * @route   GET /api/admin/modules?role=roleId
 * @access  Private/Admin
 */
const getModulesByRole = async (req, res) => {
  try {
    const { role } = req.query;
    const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    if (!role) {
      // If no role specified, return all modules
      return getAllModules(req, res);
    }
    
    // Validate role
    const validRoles = ['admin', 'teacher', 'student', 'parent', 'staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json(
        formatResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid role specified',
          status: 400
        }, { requestId })
      );
    }
    
    // Return all modules with defaults for this role
    return res.status(200).json(
      formatResponse(true, availableModules, null, {
        requestId,
        defaultAccess: defaultModuleAccessByRole[role] || []
      })
    );
  } catch (error) {
    console.error('Error getting modules by role:', error);
    return res.status(500).json(
      formatResponse(false, null, {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving modules',
        status: 500,
        details: { error: error.message }
      })
    );
  }
};

/**
 * @desc    Get user's module access
 * @route   GET /api/admin/modules/access?userId=userId
 * @access  Private/Admin
 */
const getUserModuleAccess = async (req, res) => {
  try {
    // Get userId from query params instead of route params
    const { userId } = req.query;
    const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Validate userId
    if (!userId) {
      return res.status(400).json(
        formatResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
          status: 400
        }, { requestId })
      );
    }
    
    const userIdNum = parseInt(userId);
    
    if (isNaN(userIdNum)) {
      return res.status(400).json(
        formatResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user ID format',
          status: 400
        }, { requestId })
      );
    }

    // Check if user exists
    const user = await User.findById(userIdNum);
    if (!user) {
      return res.status(404).json(
        formatResponse(false, null, {
          code: 'RESOURCE_NOT_FOUND',
          message: 'User not found',
          status: 404
        }, { requestId })
      );
    }
    
    // Get user's module access
    const access = await ModuleAccess.getUserModuleAccess(userIdNum);
    
    // If access records don't exist yet, initialize with defaults based on role
    if (!access || Object.keys(access).length === 0) {
      const userRole = user.role || 'student';
      const allModuleIds = getAllModuleIds();
      const defaultAccess = defaultModuleAccessByRole[userRole] || [];
      
      // Create a map of module IDs to access rights
      const moduleAccessMap = {};
      allModuleIds.forEach(moduleId => {
        moduleAccessMap[moduleId] = defaultAccess.includes(moduleId);
      });
      
      // Save the default access rights
      for (const [moduleId, hasAccess] of Object.entries(moduleAccessMap)) {
        await ModuleAccess.updateModuleAccess(userIdNum, moduleId, hasAccess);
      }
      
      return res.status(200).json(
        formatResponse(true, moduleAccessMap, null, { requestId })
      );
    }
    
    return res.status(200).json(
      formatResponse(true, access, null, { requestId })
    );
  } catch (error) {
    console.error('Error getting user module access:', error);
    return res.status(500).json(
      formatResponse(false, null, {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving module access',
        status: 500,
        details: { error: error.message }
      })
    );
  }
};

/**
 * @desc    Update user's module access
 * @route   POST /api/admin/modules/access
 * @access  Private/Admin
 */
const updateModuleAccess = async (req, res) => {
  try {
    const { userId, moduleId, hasAccess } = req.body;
    const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Validate input
    if (!userId) {
      return res.status(400).json(
        formatResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required',
          status: 400
        }, { requestId })
      );
    }
    
    if (!moduleId) {
      return res.status(400).json(
        formatResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'Module ID is required',
          status: 400
        }, { requestId })
      );
    }
    
    if (hasAccess === undefined || hasAccess === null) {
      return res.status(400).json(
        formatResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'Access value is required',
          status: 400
        }, { requestId })
      );
    }
    
    const userIdNum = parseInt(userId);
    
    if (isNaN(userIdNum)) {
      return res.status(400).json(
        formatResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user ID format',
          status: 400
        }, { requestId })
      );
    }
    
    // Check if user exists
    const user = await User.findById(userIdNum);
    if (!user) {
      return res.status(404).json(
        formatResponse(false, null, {
          code: 'RESOURCE_NOT_FOUND',
          message: 'User not found',
          status: 404
        }, { requestId })
      );
    }
    
    // Check if module exists
    const moduleExists = findModuleById(moduleId);
    if (!moduleExists) {
      return res.status(404).json(
        formatResponse(false, null, {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Module not found',
          status: 404
        }, { requestId })
      );
    }
    
    // Update the module access
    await ModuleAccess.updateModuleAccess(userIdNum, moduleId, hasAccess);
    
    // If updating a child module and granting access, ensure parent has access too
    const parentModule = findParentModule(moduleId);
    if (hasAccess && parentModule) {
      await ModuleAccess.updateModuleAccess(userIdNum, parentModule.id, true);
    }
    
    // Get updated module access
    const updatedAccess = await ModuleAccess.getUserModuleAccess(userIdNum);
    
    return res.status(200).json(
      formatResponse(true, updatedAccess, null, { 
        requestId,
        message: `Module access for '${moduleId}' has been ${hasAccess ? 'granted' : 'revoked'}`
      })
    );
  } catch (error) {
    console.error('Error updating module access:', error);
    return res.status(500).json(
      formatResponse(false, null, {
        code: 'SERVER_ERROR',
        message: 'An error occurred while updating module access',
        status: 500,
        details: { error: error.message }
      })
    );
  }
};

module.exports = {
  getAllModules,
  getModulesByRole,
  getUserModuleAccess,
  updateModuleAccess
};
