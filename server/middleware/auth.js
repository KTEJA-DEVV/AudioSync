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
  // Also check cookies for token
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
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

  // Check if user account is active
  if (!user.isActive) {
    throw new AppError(
      'Your account has been deactivated. Please contact support.',
      401,
      ErrorCodes.UNAUTHORIZED
    );
  }

  // Update last active timestamp
  user.lastActiveAt = new Date();
  await user.save({ validateBeforeSave: false });

  // Attach user and related info to request
  req.user = user;
  req.userId = user._id.toString();
  req.userRole = user.role;
  req.userTier = user.subscription?.tier || 'free';
  
  // Attach permission flags for easy access
  req.isAdmin = user.role === 'admin';
  req.isModerator = ['admin', 'moderator'].includes(user.role);
  req.isCreator = ['admin', 'moderator', 'creator'].includes(user.role);
  req.canCreateSession = user.canCreateSession;
  req.canManageSessions = user.canManageSessions;

  next();
});

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      // Check blacklist
      const blacklisted = await isTokenBlacklisted(token);
      if (!blacklisted) {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
          req.userId = user._id.toString();
          req.userRole = user.role;
          req.userTier = user.subscription?.tier || 'free';
          req.isAdmin = user.role === 'admin';
          req.isModerator = ['admin', 'moderator'].includes(user.role);
          req.isCreator = ['admin', 'moderator', 'creator'].includes(user.role);
          req.canCreateSession = user.canCreateSession;
          req.canManageSessions = user.canManageSessions;
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
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Not authorized', 401, ErrorCodes.UNAUTHORIZED);
  }

  if (req.user.role !== 'admin') {
    throw new AppError(
      'Access denied. Only administrators can perform this action.',
      403,
      ErrorCodes.FORBIDDEN
    );
  }

  next();
};

// Alias for requireAdmin
const isAdmin = requireAdmin;

// Check if user is moderator or admin
const requireModerator = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Not authorized', 401, ErrorCodes.UNAUTHORIZED);
  }

  if (!['admin', 'moderator'].includes(req.user.role)) {
    throw new AppError(
      'Access denied. Moderator or admin privileges required.',
      403,
      ErrorCodes.FORBIDDEN
    );
  }

  next();
};

// Check if user is creator, moderator, or admin
const requireCreator = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Not authorized', 401, ErrorCodes.UNAUTHORIZED);
  }

  if (!['admin', 'moderator', 'creator'].includes(req.user.role)) {
    throw new AppError(
      'Access denied. Creator, moderator, or admin privileges required.',
      403,
      ErrorCodes.FORBIDDEN
    );
  }

  next();
};

// =============================================
// SESSION-SPECIFIC AUTHORIZATION MIDDLEWARES
// =============================================

/**
 * Middleware to check if user can create sessions
 * Only admin, moderator, and creator roles can create sessions
 */
const canCreateSession = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Not authorized', 401, ErrorCodes.UNAUTHORIZED);
  }

  if (!req.user.canCreateSession) {
    throw new AppError(
      'Access denied. Only administrators, moderators, and creators can create sessions.',
      403,
      ErrorCodes.FORBIDDEN
    );
  }

  next();
};

/**
 * Middleware to check if user can manage sessions (full control)
 * Only admin role has full session management
 */
const canManageSession = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Not authorized', 401, ErrorCodes.UNAUTHORIZED);
  }

  if (!req.user.canManageSessions) {
    throw new AppError(
      'Access denied. Only administrators can manage sessions.',
      403,
      ErrorCodes.FORBIDDEN
    );
  }

  next();
};

/**
 * Middleware to check if user is session host or admin
 * Requires session to be loaded on req.session or fetched by sessionId param
 */
const isSessionHostOrAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AppError('Not authorized', 401, ErrorCodes.UNAUTHORIZED);
  }

  // Admin can access any session
  if (req.user.role === 'admin') {
    return next();
  }

  // Get session from request (should be attached by previous middleware)
  // or fetch it using session ID from params
  let session = req.session;
  
  if (!session && (req.params.id || req.params.sessionId)) {
    const Session = require('../models/Session');
    const sessionId = req.params.id || req.params.sessionId;
    session = await Session.findById(sessionId);
    
    if (!session) {
      throw new AppError('Session not found', 404, ErrorCodes.NOT_FOUND);
    }
    
    req.session = session;
  }

  if (!session) {
    throw new AppError('Session not found', 404, ErrorCodes.NOT_FOUND);
  }

  // Check if user is the host
  const isHost = session.host.toString() === req.user._id.toString();
  
  if (!isHost) {
    throw new AppError(
      'Access denied. Only the session host or administrators can perform this action.',
      403,
      ErrorCodes.FORBIDDEN
    );
  }

  next();
});

/**
 * Middleware to check if user is session host, moderator, or admin
 */
const isSessionHostOrModerator = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AppError('Not authorized', 401, ErrorCodes.UNAUTHORIZED);
  }

  // Admin or moderator can access any session
  if (['admin', 'moderator'].includes(req.user.role)) {
    return next();
  }

  // Get session
  let session = req.session;
  
  if (!session && (req.params.id || req.params.sessionId)) {
    const Session = require('../models/Session');
    const sessionId = req.params.id || req.params.sessionId;
    session = await Session.findById(sessionId);
    
    if (!session) {
      throw new AppError('Session not found', 404, ErrorCodes.NOT_FOUND);
    }
    
    req.session = session;
  }

  if (!session) {
    throw new AppError('Session not found', 404, ErrorCodes.NOT_FOUND);
  }

  // Check if user is the host
  const isHost = session.host.toString() === req.user._id.toString();
  
  if (!isHost) {
    throw new AppError(
      'Access denied. Only the session host, moderators, or administrators can perform this action.',
      403,
      ErrorCodes.FORBIDDEN
    );
  }

  next();
});

/**
 * Middleware to check if user is a participant in the session
 */
const isSessionParticipant = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AppError('Not authorized', 401, ErrorCodes.UNAUTHORIZED);
  }

  // Get session
  let session = req.session;
  
  if (!session && (req.params.id || req.params.sessionId)) {
    const Session = require('../models/Session');
    const sessionId = req.params.id || req.params.sessionId;
    session = await Session.findById(sessionId);
    
    if (!session) {
      throw new AppError('Session not found', 404, ErrorCodes.NOT_FOUND);
    }
    
    req.session = session;
  }

  if (!session) {
    throw new AppError('Session not found', 404, ErrorCodes.NOT_FOUND);
  }

  // Check if user is host, admin, or participant
  const isHost = session.host.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  const isParticipant = session.participants.some(
    p => p.user.toString() === req.user._id.toString() && p.isActive
  );

  if (!isHost && !isAdmin && !isParticipant) {
    throw new AppError(
      'Access denied. You must be a participant in this session.',
      403,
      ErrorCodes.FORBIDDEN
    );
  }

  // Attach participant info to request
  req.isSessionHost = isHost;
  req.isSessionParticipant = isParticipant;

  next();
});

/**
 * Middleware to check specific session permission
 */
const checkSessionPermission = (permission) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AppError('Not authorized', 401, ErrorCodes.UNAUTHORIZED);
    }

    // Get session if not already loaded
    let session = req.session;
    
    if (!session && (req.params.id || req.params.sessionId)) {
      const Session = require('../models/Session');
      const sessionId = req.params.id || req.params.sessionId;
      session = await Session.findById(sessionId);
      
      if (!session) {
        throw new AppError('Session not found', 404, ErrorCodes.NOT_FOUND);
      }
      
      req.session = session;
    }

    // Use the user model's permission check
    const hasPermission = req.user.canPerformSessionAction(permission, session);

    if (!hasPermission) {
      throw new AppError(
        `Access denied. You don't have permission to ${permission.replace('_', ' ')} for this session.`,
        403,
        ErrorCodes.FORBIDDEN
      );
    }

    next();
  });
};

/**
 * Authorize specific roles with custom error message
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError(
        'User not authenticated. Please login first.',
        401,
        ErrorCodes.UNAUTHORIZED
      );
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        `User role '${req.user.role}' is not authorized to access this route. Required role(s): ${roles.join(', ')}`,
        403,
        ErrorCodes.FORBIDDEN
      );
    }

    next();
  };
};

// =============================================
// SUBSCRIPTION & FEATURE MIDDLEWARES
// =============================================

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
      free: ['basic_voting', 'view_sessions', 'limited_contributions', 'join_session', 'submit_feedback'],
      supporter: ['basic_voting', 'view_sessions', 'unlimited_contributions', 'priority_queue', 'join_session', 'submit_feedback'],
      creator: ['basic_voting', 'view_sessions', 'unlimited_contributions', 'priority_queue', 'create_sessions', 'audio_upload', 'join_session', 'submit_feedback', 'manage_own_sessions'],
      pro: ['basic_voting', 'view_sessions', 'unlimited_contributions', 'priority_queue', 'create_sessions', 'audio_upload', 'analytics', 'api_access', 'join_session', 'submit_feedback', 'manage_own_sessions', 'advanced_analytics'],
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

// =============================================
// HELPER MIDDLEWARES
// =============================================

/**
 * Middleware to load session and attach to request
 */
const loadSession = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id || req.params.sessionId;
  
  if (!sessionId) {
    throw new AppError('Session ID is required', 400, ErrorCodes.BAD_REQUEST);
  }

  const Session = require('../models/Session');
  const session = await Session.findById(sessionId)
    .populate('host', 'username displayName avatar role')
    .populate('participants.user', 'username displayName avatar');

  if (!session) {
    throw new AppError('Session not found', 404, ErrorCodes.NOT_FOUND);
  }

  req.session = session;
  next();
});

/**
 * Middleware to check if session is active
 */
const requireActiveSession = (req, res, next) => {
  if (!req.session) {
    throw new AppError('Session not loaded', 500, ErrorCodes.INTERNAL_ERROR);
  }

  if (req.session.status === 'ended') {
    throw new AppError('This session has ended', 400, ErrorCodes.BAD_REQUEST);
  }

  next();
};

/**
 * Middleware to check if session allows the action based on status
 */
const requireSessionStatus = (...allowedStatuses) => {
  return (req, res, next) => {
    if (!req.session) {
      throw new AppError('Session not loaded', 500, ErrorCodes.INTERNAL_ERROR);
    }

    if (!allowedStatuses.includes(req.session.status)) {
      throw new AppError(
        `This action is not allowed when session is ${req.session.status}. Allowed statuses: ${allowedStatuses.join(', ')}`,
        400,
        ErrorCodes.BAD_REQUEST
      );
    }

    next();
  };
};

/**
 * Middleware to check if user owns the resource or is admin
 */
const ownerOrAdmin = (resourceUserField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Not authorized', 401, ErrorCodes.UNAUTHORIZED);
    }

    // Admin can access anything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if resource exists and user owns it
    const resource = req.resource || req.session;
    if (resource && resource[resourceUserField]) {
      const ownerId = resource[resourceUserField]._id 
        ? resource[resourceUserField]._id.toString()
        : resource[resourceUserField].toString();
      const userId = req.user._id.toString();
      
      if (ownerId === userId) {
        return next();
      }
    }

    throw new AppError(
      'You do not have permission to perform this action',
      403,
      ErrorCodes.FORBIDDEN
    );
  };
};

/**
 * Rate limiting helper for specific actions
 */
const actionRateLimit = (maxAttempts, windowMs, actionName) => {
  const attempts = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const key = `${req.user._id}-${actionName}`;
    const now = Date.now();
    const userAttempts = attempts.get(key) || [];
    
    // Filter out old attempts
    const recentAttempts = userAttempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      throw new AppError(
        `Too many ${actionName} attempts. Please try again later.`,
        429,
        ErrorCodes.RATE_LIMITED
      );
    }

    recentAttempts.push(now);
    attempts.set(key, recentAttempts);

    next();
  };
};

// =============================================
// EXPORTS
// =============================================

module.exports = {
  // Token utilities
  generateToken,
  verifyToken,
  
  // Core auth middlewares
  requireAuth,
  optionalAuth,
  
  // Role-based middlewares
  requireRole,
  requireAdmin,
  requireModerator,
  requireCreator,
  authorize,
  isAdmin,
  
  // Session-specific middlewares
  canCreateSession,
  canManageSession,
  isSessionHostOrAdmin,
  isSessionHostOrModerator,
  isSessionParticipant,
  checkSessionPermission,
  loadSession,
  requireActiveSession,
  requireSessionStatus,
  requireHostOrAdmin,
  
  // Subscription middlewares
  requireSubscription,
  requireFeature,
  
  // Other middlewares
  requireVerifiedEmail,
  ownerOrAdmin,
  actionRateLimit,
  
  // Aliases for compatibility
  protect: requireAuth,
  restrictTo: requireRole,
};