// ============================================================================
// Mitigation Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const {
  createMitigation,
  updateMitigation,
  listMitigations,
  getStats,
} = require('../controllers/mitigationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createMitigation);
router.patch('/:id', updateMitigation);
router.put('/:id', updateMitigation);
router.get('/', listMitigations);
router.get('/stats', getStats);

module.exports = router;
