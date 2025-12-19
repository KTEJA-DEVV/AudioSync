const express = require('express');
const router = express.Router();
const {
  getSong,
  voteSong,
  removeSongVote,
  recordPlay,
  toggleLike,
} = require('../controllers/songController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/:id', optionalAuth, getSong);
router.post('/:id/play', recordPlay);

// Protected routes
router.post('/:id/vote', requireAuth, voteSong);
router.delete('/:id/vote', requireAuth, removeSongVote);
router.post('/:id/like', requireAuth, toggleLike);

module.exports = router;

