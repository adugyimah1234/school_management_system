const userService = require('../services/userService');
const response = require('../utils/apiResponse');

// ✅ Register new user
exports.register = async (req, res, next) => {
  try {
    const user = await userService.registerUser(req.body);
    return response.success(res, user, 'User created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ✅ Get user by ID
exports.getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return response.error(res, 'User not found', 404);
    }
    return response.success(res, user, 'User fetched successfully');
  } catch (err) {
    next(err);
  }
};

// ✅ Get user profile image fallback
exports.getProfileImage = async (req, res) => {
  const path = require('path');
  const fs = require('fs');

  const userId = req.params.id;
  // Professional fallback: check for existing image, otherwise send default avatar
  const imagePath = path.join(__dirname, '../public/avatar.png');

  if (fs.existsSync(imagePath)) {
    return res.sendFile(imagePath);
  } else {
    // If even fallback is missing, send a small transparent pixel or 204
    return res.status(404).send('Not Found');
  }
};
