const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError, ErrorCodes, asyncHandler } = require('./errorHandler');
const User = require('../models/User');
const { isTokenBlacklisted } = require('../controllers/authController');

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token has expired', 401, ErrorCodes.TOKEN_EXPIRED);
    }
    throw new AppError('Invalid token', 401, ErrorCodes.INVALID_TOKEN);
  }
};

// Generate JWT token
const generateToken = (userId, options = {}) => {
  return jwt.sign(
    { id: userId, ...options },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

// Required authentication middleware
const requireAuth = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Not authorized, no token provided', 401, ErrorCodes.UNAUTHORIZED);
  }

  // Check if token is blacklisted
  try {
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      throw new AppError('Token has been revoked', 401, ErrorCodes.INVALID_TOKEN);
    }
  } catch (err) {
    // If Redis is not available, skip blacklist check
    if (!err.code) throw err;
  }

  // Verify token
  const decoded = verifyToken(token);

  // Get user from database
  const user = await User.findById(decoded.id).select('-password');
  
  if (!user) {
    throw new AppError('User not found', 401, ErrorCodes.UNAUTHORIZED);
  }

  // Attach user to request
  req.user = user;
  req.userId = user._id.toString();
  req.userRole = user.role;
  req.userTier = user.subscription?.tier || 'free';

  next();
});

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      // Check blacklist
      const blacklisted = await isTokenBlacklisted(token);
      if (!blacklisted) {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user) {
          req.user = user;
          req.userId = user._id.toString();
          req.userRole = user.role;
          req.userTier = user.subscription?.tier || 'free';
        }
      }
    } catch {
      // Ignore token errors for optional auth
    }
  }

  next();
});

// Role-based authorization middleware factory
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Not authorized', 401, ErrorCodes.UNAUTHORIZED);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        `This action requires one of the following roles: ${roles.join(', ')}`,
        403,
        ErrorCodes.FORBIDDEN
      );
    }

    next();
  };
};

// Check if user is admin
const requireAdmin = requireRole('admin');

// Check if user is moderator or admin
const requireModerator = requireRole('moderator', 'admin');

// Check if user is creator, moderator, or admin
const requireCreator = requireRole('creator', 'moderator', 'admin');

// Subscription tier middleware factory
const requireSubscription = (...tiers) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Not authorized', 401, ErrorCodes.UNAUTHORIZED);
    }

    const userTier = req.user.subscription?.tier || 'free';
    
    // Define tier hierarchy
    const tierHierarchy = ['free', 'supporter', 'creator', 'pro'];
    const userTierIndex = tierHierarchy.indexOf(userTier);
    
    // Check if user's tier is in allowed tiers or higher than minimum required
    const minRequiredIndex = Math.min(...tiers.map(t => tierHierarchy.indexOf(t)));
    
    if (userTierIndex < minRequiredIndex) {
      throw new AppError(
        `This feature requires ${tiers[0]} subscription or higher`,
        403,
        ErrorCodes.INSUFFICIENT_PERMISSIONS
      );
    }

    next();
  };
};

// Check specific feature access
const requireFeature = (feature) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Not authorized', 401, ErrorCodes.UNAUTHORIZED);
    }

    const userFeatures = req.user.subscription?.features || [];
    const tier = req.user.subscription?.tier || 'free';

    // Define default features per tier
    const defaultFeatures = {
      free: ['basic_voting', 'view_sessions', 'limited_contributions'],
      supporter: ['basic_voting', 'view_sessions', 'unlimited_contributions', 'priority_queue'],
      creator: ['basic_voting', 'view_sessions', 'unlimited_contributions', 'priority_queue', 'create_sessions', 'audio_upload'],
      pro: ['basic_voting', 'view_sessions', 'unlimited_contributions', 'priority_queue', 'create_sessions', 'audio_upload', 'analytics', 'api_access'],
    };

    const availableFeatures = [...(defaultFeatures[tier] || []), ...userFeatures];

    if (!availableFeatures.includes(feature)) {
      throw new AppError(
        `Your subscription does not include access to ${feature}`,
        403,
        ErrorCodes.INSUFFICIENT_PERMISSIONS
      );
    }

    next();
  };
};

// Email verification requirement
const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Not authorized', 401, ErrorCodes.UNAUTHORIZED);
  }

  if (!req.user.emailVerified) {
    throw new AppError(
      'Please verify your email to access this feature',
      403,
      ErrorCodes.FORBIDDEN
    );
  }

  next();
};

module.exports = {
  generateToken,
  verifyToken,
  requireAuth,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireModerator,
  requireCreator,
  requireSubscription,
  requireFeature,
  requireVerifiedEmail,
  // Aliases for compatibility
  protect: requireAuth,
  restrictTo: requireRole,
};
