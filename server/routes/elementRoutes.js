const express = require('express');
const router = express.Router();
const {
  getCompetition,
  submitToCompetition,
  voteOnCompetition,
  getCompetitionResults,
  startCompetitionVoting,
  closeCompetition,
} = require('../controllers/elementController');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');

// Competition routes (not session-scoped)
router.get('/competitions/:id', optionalAuth, getCompetition);
router.post('/competitions/:id/submit', requireAuth, submitToCompetition);
router.post('/competitions/:id/vote', requireAuth, voteOnCompetition);
router.get('/competitions/:id/results', getCompetitionResults);
router.post('/competitions/:id/start-voting', requireAuth, startCompetitionVoting);
router.post('/competitions/:id/close', requireAuth, closeCompetition);

module.exports = router;

