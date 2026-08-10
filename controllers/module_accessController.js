const ModuleAccess = require('../models/module');
const User = require('../models/user');

/**
 * Available modules in the system
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
    id: 'assessments',
    name: 'Entrance Assessments',
    path: '/assessments',
    description: 'Assessment management',
    children: [
      { id: 'view-results', name: 'View Results', path: '/assessments/results', description: 'View assessment results' },
      { id: 'recordings', name: 'Recordings', path: '/assessments/recordings', description: 'Manage assessment recordings' },
      { id: 'shortlisted', name: 'Shortlisted', path: '/assessments/shortlisted', description: 'View shortlisted candidates' }
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
      { id: 'assessment-config', name: 'Assessment Config', path: '/admin/assessment-config', description: 'Configure assessments' },
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
 * Get all module IDs including children
 */
function getAllModuleIds() {
  return availableModules.flatMap(module =>
    [module.id, ...(module.children?.map(child => child.id) || [])]
  );
}

/**
 * Default module access by user role
 */
const defaultModuleAccessByRole = {
  'admin': getAllModuleIds(),
  'teacher': [
    'dashboard',
    'assessments', 'view-results', 'recordings',
    'profile'
  ],
  'student': [
    'dashboard',
    'profile',
    'assessments', 'view-results',
    'fees', 'invoices', 'payment-history'
  ],
  'parent': [
    'dashboard',
    'profile',
    'assessments', 'view-results',
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
 * Find a module by ID
 */
function findModuleById(moduleId) {
  for (const module of availableModules) {
    if (module.id === moduleId) {
      return module;
    }
    if (module.children && module.children.length > 0) {
      const childModule = module.children.find(child => child.id === moduleId);
      if (childModule) return childModule;
    }
  }
  return null;
}

/**
 * Find parent module of a child module
 */
function findParentModule(childModuleId) {
  for (const module of availableModules) {
    if (module.children && module.children.some(child => child.id === childModuleId)) {
      return module;
    }
  }
  return null;
}

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

const getAllModules = async (req, res) => {
  try {
    const requestId = `req-${Date.now()}`;
    return res.status(200).json(formatResponse(true, availableModules, null, { requestId }));
  } catch (error) {
    return res.status(500).json(formatResponse(false, null, { message: error.message }));
  }
};

const getModulesByRole = async (req, res) => {
  try {
    const { role } = req.query;
    if (!role) return getAllModules(req, res);
    
    return res.status(200).json(
      formatResponse(true, availableModules, null, {
        defaultAccess: defaultModuleAccessByRole[role] || []
      })
    );
  } catch (error) {
    return res.status(500).json(formatResponse(false, null, { message: error.message }));
  }
};

const getUserModuleAccess = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json(formatResponse(false, null, { message: 'User ID required' }));

    const user = await User.findById(userId);
    if (!user) return res.status(404).json(formatResponse(false, null, { message: 'User not found' }));
    
    const access = await ModuleAccess.getUserModuleAccess(userId);
    
    if (!access || Object.keys(access).length === 0) {
      const userRole = user.role || 'student';
      const allModuleIds = getAllModuleIds();
      const defaultAccess = defaultModuleAccessByRole[userRole] || [];
      
      const moduleAccessMap = {};
      allModuleIds.forEach(moduleId => {
        moduleAccessMap[moduleId] = defaultAccess.includes(moduleId);
      });
      
      for (const [moduleId, hasAccess] of Object.entries(moduleAccessMap)) {
        await ModuleAccess.updateModuleAccess(userId, moduleId, hasAccess);
      }
      
      return res.status(200).json(formatResponse(true, moduleAccessMap));
    }
    
    return res.status(200).json(formatResponse(true, access));
  } catch (error) {
    return res.status(500).json(formatResponse(false, null, { message: error.message }));
  }
};

const updateModuleAccess = async (req, res) => {
  try {
    const { userId, moduleId, hasAccess } = req.body;
    if (!userId || !moduleId) return res.status(400).json(formatResponse(false, null, { message: 'ID missing' }));

    const user = await User.findById(userId);
    if (!user) return res.status(404).json(formatResponse(false, null, { message: 'User not found' }));
    
    const moduleExists = findModuleById(moduleId);
    if (!moduleExists) return res.status(404).json(formatResponse(false, null, { message: 'Module not found' }));
    
    await ModuleAccess.updateModuleAccess(userId, moduleId, hasAccess);
    
    if (hasAccess) {
      const parentModule = findParentModule(moduleId);
      if (parentModule) await ModuleAccess.updateModuleAccess(userId, parentModule.id, true);
    }

    const updatedAccess = await ModuleAccess.getUserModuleAccess(userId);
    return res.status(200).json(formatResponse(true, updatedAccess));
  } catch (error) {
    return res.status(500).json(formatResponse(false, null, { message: error.message }));
  }
};

module.exports = {
  getAllModules,
  getModulesByRole,
  getUserModuleAccess,
  updateModuleAccess
};
