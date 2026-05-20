const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const {
  protect,
  loadAccessContext,
  resolveBranch,
  enforceScopeOnWrite
} = require('../middlewares/authMiddleware');

router.use(protect, loadAccessContext, resolveBranch());
router.get('/', studentController.getAllStudents);
router.get('/:id', studentController.getStudent);
router.post('/', enforceScopeOnWrite({ branchRequired: false }), studentController.createStudent);
router.delete('/:id', studentController.deleteStudent);
router.post('/:id/promote', studentController.promoteStudent);
router.post('/:id/transfer', enforceScopeOnWrite({ branchRequired: false }), studentController.transferStudent);
router.put('/:id', enforceScopeOnWrite({ branchRequired: false }), studentController.updateStudent);



module.exports = router;