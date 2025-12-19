const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getUserContributions,
  getUserOwnedSongs,
  getMyOwnership,
  getMyRevenue,
  getMyRevenueHistory,
} = require('../controllers/libraryController');

const router = express.Router();

// Public routes
router.get('/:id/songs', getUserContributions);
router.get('/:id/owned-songs', getUserOwnedSongs);

// Protected routes (for "me" endpoints)
router.use(protect);

router.get('/me/ownership', getMyOwnership);
router.get('/me/revenue', getMyRevenue);
router.get('/me/revenue/history', getMyRevenueHistory);

module.exports = router;

