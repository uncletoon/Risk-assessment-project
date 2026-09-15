// ============================================================================
// AI Risk Advisor Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const { askAdvisor } = require('../controllers/advisorController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/query', askAdvisor);

module.exports = router;
