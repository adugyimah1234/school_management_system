const categoryService = require('../services/categoryService');
const response = require('../utils/apiResponse');

// ✅ Get all categories
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAllCategories(req.user);
    return response.success(res, categories);
  } catch (error) {
    next(error);
  }
};

// ✅ Get one category by ID
exports.getCategoryById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const category = await categoryService.getCategoryById(id);
    if (!category) {
      return response.error(res, 'Category not found', 404);
    }
    return response.success(res, category);
  } catch (error) {
    next(error);
  }
};

// ✅ Create new category
exports.createCategory = async (req, res, next) => {
  const { name, code, description, amount, status, school_id } = req.body;
  if (!name) {
    return response.error(res, 'Category name is required', 400);
  }
  try {
    const user = req.user;
    let garrison_id = null;
    let final_school_id = school_id;

    // If Garrison Director or Garrison Admin is creating, assign to garrison and make it shared (null school_id)
    if (user.role === 'garrison_director' || user.role === 'admin') {
      garrison_id = user.garrison_id;
      final_school_id = null;
    } else if (user.role === 'school_admin' || user.school_id) {
      final_school_id = user.school_id;
      garrison_id = user.garrison_id;
    }

    const category = await categoryService.createCategory({
      name,
      code,
      description,
      amount,
      status,
      school_id: final_school_id,
      garrison_id
    });
    return response.success(res, category, 'Category created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// ✅ Update category
exports.updateCategory = async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;
  try {
    const success = await categoryService.updateCategory(id, updateData);
    if (!success) {
      return response.error(res, 'Category not found', 404);
    }
    return response.success(res, null, 'Category updated successfully');
  } catch (error) {
    next(error);
  }
};

// ✅ Delete category
exports.deleteCategory = async (req, res, next) => {
  const { id } = req.params;
  try {
    const success = await categoryService.deleteCategory(id);
    if (!success) {
      return response.error(res, 'Category not found', 404);
    }
    return response.success(res, null, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
};
