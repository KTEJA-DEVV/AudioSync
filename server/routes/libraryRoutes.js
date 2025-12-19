const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth');
const {
  getSongs,
  getFeaturedSongs,
  getTrendingSongs,
  searchSongs,
  getSong,
  recordPlay,
  toggleLike,
  getSongLyrics,
  getSongContributors,
  getUserContributions,
  getUserOwnedSongs,
  getSongOwnership,
  transferOwnership,
  getMyOwnership,
  getSongRevenue,
  getMyRevenue,
  getMyRevenueHistory,
  getGenres,
  getMoods,
} = require('../controllers/libraryController');

const router = express.Router();

// ==================== PUBLIC LIBRARY ROUTES ====================

// Song library
router.get('/', optionalAuth, getSongs);
router.get('/featured', getFeaturedSongs);
router.get('/trending', getTrendingSongs);
router.get('/search', searchSongs);
router.get('/genres', getGenres);
router.get('/moods', getMoods);

// Single song (public with optional auth for personalized data)
router.get('/:id', optionalAuth, getSong);
router.get('/:id/lyrics', getSongLyrics);
router.get('/:id/contributors', getSongContributors);
router.get('/:id/ownership', getSongOwnership);

// Play tracking (can be anonymous)
router.post('/:id/play', recordPlay);

// ==================== PROTECTED ROUTES ====================

router.use(protect);

// User interactions
router.post('/:id/like', toggleLike);

// Ownership
router.post('/:id/ownership/transfer', transferOwnership);

// Revenue (owner/contributor only)
router.get('/:id/revenue', getSongRevenue);

module.exports = router;

