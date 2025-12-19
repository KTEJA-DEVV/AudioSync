const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { adminAuth, modAuth } = require('../middleware/adminAuth');
const {
  // Stats
  getDashboardStats,
  getUserStats,
  getSessionStats,
  getRevenueStats,
  // User Management
  getUsers,
  getUserDetails,
  updateUser,
  warnUser,
  muteUser,
  banUser,
  unbanUser,
  // Reports
  getReports,
  getReportDetails,
  updateReport,
  // Content
  getFlaggedContent,
  hideContent,
  deleteContent,
  featureContent,
  // Sessions
  getSessions,
  updateSession,
  cancelSession,
  featureSession,
  // Settings
  getSettings,
  updateSetting,
  // Announcements
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  // Mod Actions
  getModActions,
} = require('../controllers/adminController');

// All routes require authentication
router.use(protect);

// ==================== STATS ====================
// Accessible by moderators and admins
router.get('/stats', modAuth, getDashboardStats);
router.get('/stats/users', modAuth, getUserStats);
router.get('/stats/sessions', modAuth, getSessionStats);
router.get('/stats/revenue', adminAuth, getRevenueStats);

// ==================== USER MANAGEMENT ====================
router.get('/users', modAuth, getUsers);
router.get('/users/:id', modAuth, getUserDetails);
router.put('/users/:id', adminAuth, updateUser);
router.post('/users/:id/warn', modAuth, warnUser);
router.post('/users/:id/mute', modAuth, muteUser);
router.post('/users/:id/ban', adminAuth, banUser);
router.post('/users/:id/unban', adminAuth, unbanUser);

// ==================== REPORTS ====================
router.get('/reports', modAuth, getReports);
router.get('/reports/:id', modAuth, getReportDetails);
router.put('/reports/:id', modAuth, updateReport);

// ==================== CONTENT MODERATION ====================
router.get('/content/flagged', modAuth, getFlaggedContent);
router.post('/content/:type/:id/hide', modAuth, hideContent);
router.post('/content/:type/:id/delete', adminAuth, deleteContent);
router.post('/content/:type/:id/feature', modAuth, featureContent);

// ==================== SESSION MANAGEMENT ====================
router.get('/sessions', modAuth, getSessions);
router.put('/sessions/:id', adminAuth, updateSession);
router.post('/sessions/:id/cancel', adminAuth, cancelSession);
router.post('/sessions/:id/feature', modAuth, featureSession);

// ==================== SETTINGS ====================
router.get('/settings', adminAuth, getSettings);
router.put('/settings/:key', adminAuth, updateSetting);

// ==================== ANNOUNCEMENTS ====================
router.get('/announcements', modAuth, getAnnouncements);
router.post('/announcements', adminAuth, createAnnouncement);
router.put('/announcements/:id', adminAuth, updateAnnouncement);
router.delete('/announcements/:id', adminAuth, deleteAnnouncement);

// ==================== MOD ACTIONS LOG ====================
router.get('/mod-actions', adminAuth, getModActions);

module.exports = router;
