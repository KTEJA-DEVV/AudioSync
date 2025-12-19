const express = require('express');
const router = express.Router();
const {
  // Reputation
  getReputation,
  getReputationLeaderboard,
  getVoteWeight,
  recalculateReputations,
  // Badges
  getAllBadges,
  getUserBadges,
  getBadgesWithProgress,
  checkBadges,
  togglePinBadge,
  // Rewards
  getRewards,
  getPendingRewards,
  claimReward,
  getEarnings,
  requestPayout,
  // Tips
  sendTip,
  getTipsReceived,
  getTipsSent,
} = require('../controllers/rewardsController');
const { requireAuth, optionalAuth, requireAdmin } = require('../middleware/auth');

// ==========================================
// REPUTATION ROUTES
// ==========================================
router.get('/reputation/leaderboard', optionalAuth, getReputationLeaderboard);
router.post('/reputation/calculate', requireAuth, requireAdmin, recalculateReputations);

// User reputation (moved to user routes for cleaner API)
router.get('/users/:id/reputation', optionalAuth, getReputation);
router.get('/users/me/vote-weight', requireAuth, getVoteWeight);

// ==========================================
// BADGE ROUTES
// ==========================================
router.get('/badges', getAllBadges);
router.get('/badges/progress', requireAuth, getBadgesWithProgress);
router.post('/badges/check/:userId?', requireAuth, checkBadges);

// User badges
router.get('/users/:id/badges', getUserBadges);
router.put('/users/me/badges/:badgeId/pin', requireAuth, togglePinBadge);

// ==========================================
// REWARD ROUTES
// ==========================================
router.get('/users/me/rewards', requireAuth, getRewards);
router.get('/users/me/rewards/pending', requireAuth, getPendingRewards);
router.post('/users/me/rewards/:id/claim', requireAuth, claimReward);
router.get('/users/me/earnings', requireAuth, getEarnings);
router.post('/users/me/payout', requireAuth, requestPayout);

// ==========================================
// TIP ROUTES
// ==========================================
router.post('/tips', requireAuth, sendTip);
router.get('/users/me/tips/received', requireAuth, getTipsReceived);
router.get('/users/me/tips/sent', requireAuth, getTipsSent);

module.exports = router;

