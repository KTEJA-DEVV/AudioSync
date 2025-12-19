const express = require('express');
const router = express.Router();
const {
  createLiveSession,
  getLiveSessions,
  getCurrentlyLive,
  getUpcoming,
  getPast,
  getLiveSession,
  updateLiveSession,
  goLive,
  endStream,
  pauseStream,
  getChatMessages,
  postChatMessage,
  deleteChatMessage,
  highlightChatMessage,
  postReaction,
  getReactions,
  startVotingRound,
  castVoteInRound,
  getCurrentVotingRound,
  updateActivity,
  getActivity,
} = require('../controllers/liveSessionController');
const { requireAuth, optionalAuth, requireCreator } = require('../middleware/auth');

// Live session management
router.get('/', optionalAuth, getLiveSessions);
router.get('/live', getCurrentlyLive);
router.get('/upcoming', getUpcoming);
router.get('/past', getPast);
router.post('/', requireAuth, requireCreator, createLiveSession);
router.get('/:id', optionalAuth, getLiveSession);
router.put('/:id', requireAuth, updateLiveSession);

// Stream control
router.post('/:id/go-live', requireAuth, goLive);
router.post('/:id/end', requireAuth, endStream);
router.post('/:id/pause', requireAuth, pauseStream);

// Chat
router.get('/:id/chat', getChatMessages);
router.post('/:id/chat', requireAuth, postChatMessage);
router.delete('/:id/chat/:messageId', requireAuth, deleteChatMessage);
router.post('/:id/chat/:messageId/highlight', requireAuth, highlightChatMessage);

// Reactions
router.post('/:id/react', requireAuth, postReaction);
router.get('/:id/reactions', getReactions);

// Voting rounds
router.post('/:id/voting-round', requireAuth, startVotingRound);
router.put('/:id/voting-round/:round/vote', requireAuth, castVoteInRound);
router.get('/:id/voting-round/current', getCurrentVotingRound);

// Activity
router.post('/:id/activity', requireAuth, updateActivity);
router.get('/:id/activity', getActivity);

module.exports = router;

