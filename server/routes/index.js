const express = require('express');
const router = express.Router();

const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const sessionRoutes = require('./sessionRoutes');
const songRoutes = require('./songRoutes');
const stemRoutes = require('./stemRoutes');
const elementRoutes = require('./elementRoutes');
const liveSessionRoutes = require('./liveSessionRoutes');
const rewardsRoutes = require('./rewardsRoutes');
const libraryRoutes = require('./libraryRoutes');
const userLibraryRoutes = require('./userLibraryRoutes');
const adminRoutes = require('./adminRoutes');

// Mount routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/sessions', sessionRoutes);
router.use('/songs', songRoutes);
router.use('/stems', stemRoutes);
router.use('/elements', elementRoutes);
router.use('/live-sessions', liveSessionRoutes);

// Library routes - extended song library with contributors and ownership
router.use('/library', libraryRoutes);
router.use('/library/users', userLibraryRoutes);

// Rewards routes - mounted at root to allow /badges, /tips, /reputation, and /users/me/* routes
router.use('/', rewardsRoutes);

// Admin routes
router.use('/admin', adminRoutes);

module.exports = router;
