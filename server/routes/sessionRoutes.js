const express = require('express');
const router = express.Router();
const {
  createSession,
  getSessions,
  getLiveSessions,
  getSession,
  updateSession,
  advanceStage,
  joinSession,
  cancelSession,
} = require('../controllers/sessionController');
const {
  submitLyrics,
  getSessionLyrics,
  getLyricsById,
  updateLyrics,
  deleteLyrics,
  getVotingResults,
  addFeedback,
} = require('../controllers/lyricsController');
const {
  castVote,
  removeVote,
  getUserVotes,
  getVoteLeaderboard,
} = require('../controllers/voteController');
const {
  triggerGeneration,
  getGenerationStatus,
  cancelSessionGeneration,
  getSessionSongs,
  getSongResults,
} = require('../controllers/songController');
const {
  uploadStem,
  getSessionStems,
  uploadProjectFile,
  uploadAudioFile,
} = require('../controllers/stemController');
const {
  createElementOptions,
  getElementOptions,
  voteElementOption,
  removeElementOptionVote,
  getElementResults,
  submitUserOption,
  createCompetition,
  getCompetitions,
  getGranularBreakdown,
} = require('../controllers/elementController');
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
const { requireAuth, optionalAuth, requireAdmin, requireCreator } = require('../middleware/auth');

// Session routes
// Public/authenticated routes - no admin required
router.get('/', optionalAuth, getSessions);
router.get('/live', getLiveSessions);
router.get('/:id', optionalAuth, getSession);
router.post('/:id/join', requireAuth, joinSession);

// Admin-only routes
router.post('/', requireAuth, requireAdmin, createSession);
router.delete('/:id', requireAuth, requireAdmin, cancelSession);

// Admin or session host routes
router.put('/:id', requireAuth, updateSession); // Controller checks if user is host
router.put('/:id/stage', requireAuth, advanceStage); // Controller checks if user is host

// Lyrics routes
router.get('/:id/lyrics', optionalAuth, getSessionLyrics);
router.get('/:id/lyrics/results', optionalAuth, getVotingResults);
router.get('/:id/lyrics/:lyricsId', optionalAuth, getLyricsById);
router.post('/:id/lyrics', requireAuth, submitLyrics);
router.put('/:id/lyrics/:lyricsId', requireAuth, updateLyrics);
router.delete('/:id/lyrics/:lyricsId', requireAuth, deleteLyrics);

// Voting routes (lyrics)
router.post('/:id/lyrics/:lyricsId/vote', requireAuth, castVote);
router.delete('/:id/lyrics/:lyricsId/vote', requireAuth, removeVote);
router.post('/:id/lyrics/:lyricsId/feedback', requireAuth, addFeedback);

// Vote utility routes
router.get('/:id/votes', requireAuth, getUserVotes);
router.get('/:id/votes/leaderboard', optionalAuth, getVoteLeaderboard);

// Generation routes
router.post('/:id/generate', requireAuth, triggerGeneration);
router.get('/:id/generation-status', getGenerationStatus);
router.post('/:id/cancel-generation', requireAuth, cancelSessionGeneration);

// Song routes (session-scoped)
router.get('/:id/songs', optionalAuth, getSessionSongs);
router.get('/:id/songs/results', optionalAuth, getSongResults);

// Stem routes (session-scoped)
router.get('/:id/stems', optionalAuth, getSessionStems);
router.post('/:id/stems', requireAuth, uploadStem);
router.post('/:id/upload-project', requireAuth, uploadProjectFile);
router.post('/:id/upload-audio', requireAuth, uploadAudioFile);

// Element voting routes
router.get('/:id/element-options', optionalAuth, getElementOptions);
router.post('/:id/element-options', requireAuth, createElementOptions);
router.post('/:id/element-options/submit', requireAuth, submitUserOption);
router.post('/:id/element-options/:optionId/vote', requireAuth, voteElementOption);
router.delete('/:id/element-options/:optionId/vote', requireAuth, removeElementOptionVote);
router.get('/:id/element-results', optionalAuth, getElementResults);

// Element competition routes (session-scoped)
router.get('/:id/element-competitions', optionalAuth, getCompetitions);
router.post('/:id/element-competitions', requireAuth, createCompetition);

// Granular breakdown
router.get('/:id/granular-breakdown', optionalAuth, getGranularBreakdown);

// Feedback/Word Cloud routes
router.post('/:id/feedback/start', requireAuth, startFeedback);
router.post('/:id/feedback/stop', requireAuth, stopFeedback);
router.post('/:id/feedback/words', optionalAuth, submitWords);
router.get('/:id/feedback/words', getWords);
router.get('/:id/feedback/stats', getStats);
router.get('/:id/feedback/suggestions', getSuggestions);
router.get('/:id/feedback/stream', streamUpdates);
router.delete('/:id/feedback/word/:word', requireAuth, deleteWord);

module.exports = router;
