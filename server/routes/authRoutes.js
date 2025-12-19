const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { applyRateLimiting } = require('../middleware/rateLimiter');

// Public routes with rate limiting
router.post('/register', applyRateLimiting, register);
router.post('/login', applyRateLimiting, login);
router.post('/forgot-password', applyRateLimiting, forgotPassword);
router.post('/reset-password', applyRateLimiting, resetPassword);
router.post('/verify-email', verifyEmail);

// Protected routes
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);
router.post('/resend-verification', requireAuth, resendVerification);

module.exports = router;
