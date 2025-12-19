const express = require('express');
const router = express.Router();
const {
  getStem,
  updateStem,
  deleteStem,
  voteStem,
  removeStemVote,
  analyzeUploadedStem,
  approveStem,
  rejectStem,
} = require('../controllers/stemController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Public routes
router.get('/:id', getStem);

// Protected routes
router.put('/:id', requireAuth, updateStem);
router.delete('/:id', requireAuth, deleteStem);
router.post('/:id/vote', requireAuth, voteStem);
router.delete('/:id/vote', requireAuth, removeStemVote);
router.post('/:id/analyze', requireAuth, analyzeUploadedStem);

// Moderator routes
router.post('/:id/approve', requireAuth, requireRole('moderator', 'admin'), approveStem);
router.post('/:id/reject', requireAuth, requireRole('moderator', 'admin'), rejectStem);

module.exports = router;

