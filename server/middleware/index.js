const { errorHandler, asyncHandler, AppError, ErrorCodes } = require('./errorHandler');
const { applyRateLimiting, baseLimiter, authenticatedLimiter, premiumLimiter } = require('./rateLimiter');
const {
  requireAuth,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireModerator,
  requireCreator,
  requireSubscription,
  requireFeature,
  requireVerifiedEmail,
  generateToken,
  verifyToken,
} = require('./auth');
const { uploadAudio, uploadMultipleAudio, handleMulterError } = require('./upload');

module.exports = {
  // Error handling
  errorHandler,
  asyncHandler,
  AppError,
  ErrorCodes,
  
  // Rate limiting
  applyRateLimiting,
  baseLimiter,
  authenticatedLimiter,
  premiumLimiter,
  
  // Authentication & Authorization
  requireAuth,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireModerator,
  requireCreator,
  requireSubscription,
  requireFeature,
  requireVerifiedEmail,
  generateToken,
  verifyToken,
  
  // File upload
  uploadAudio,
  uploadMultipleAudio,
  handleMulterError,
};
