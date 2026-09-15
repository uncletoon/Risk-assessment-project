const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  getAllUsers,
  createUser,
  getSystemHealth,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

// Admin endpoints
router.get('/admin/users', getAllUsers);
router.post('/admin/users', createUser);
router.get('/admin/system-health', getSystemHealth);

module.exports = router;
