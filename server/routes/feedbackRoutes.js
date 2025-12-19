const express = require('express');
const router = express.Router();
const {
  startFeedback,
  stopFeedback,
  submitWords,
  getWords,
  getStats,
  deleteWord,
  getSuggestions,
  streamUpdates,
} = require('../controllers/feedbackController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Session-scoped feedback routes
// Start/stop feedback collection (host only)
router.post('/:id/feedback/start', requireAuth, startFeedback);
router.post('/:id/feedback/stop', requireAuth, stopFeedback);

// Submit words (public with optional auth for tracking)
router.post('/:id/feedback/words', optionalAuth, submitWords);

// Get word cloud data (public)
router.get('/:id/feedback/words', getWords);

// Get feedback stats (public)
router.get('/:id/feedback/stats', getStats);

// Get quick feedback suggestions (public)
router.get('/:id/feedback/suggestions', getSuggestions);

// SSE stream for real-time updates (alternative to WebSocket)
router.get('/:id/feedback/stream', streamUpdates);

// Delete word (moderator/host only)
router.delete('/:id/feedback/word/:word', requireAuth, deleteWord);

module.exports = router;

