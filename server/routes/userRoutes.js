const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  getUserByUsername,
  updateProfile,
  updatePreferences,
  getUserContributions,
  getLeaderboard,
  searchUsers,
  followUser,
  unfollowUser,
} = require('../controllers/userController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/leaderboard', getLeaderboard);
router.get('/search', searchUsers);
router.get('/username/:username', getUserByUsername);
router.get('/:id', optionalAuth, getUserProfile);
router.get('/:id/contributions', getUserContributions);

// Protected routes
router.put('/profile', requireAuth, updateProfile);
router.put('/preferences', requireAuth, updatePreferences);
router.post('/:id/follow', requireAuth, followUser);
router.delete('/:id/follow', requireAuth, unfollowUser);

module.exports = router;

