const {
  protect,
  authorizeRoles,
} = require('../middlewares/authMiddleware');

const authorize = (...roles) => authorizeRoles(...roles);

module.exports = {
  protect,
  authorize
};