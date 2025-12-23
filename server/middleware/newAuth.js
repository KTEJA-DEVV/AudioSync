const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Optional authentication - attaches user if token present but doesn't require it
const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Token invalid but we don't reject - just continue without user
    }
  }

  next();
};

// Require admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.'
    });
  }

  next();
};

// Require specific roles (factory function)
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}` 
      });
    }

    next();
  };
};

// Require moderator or admin
const requireModerator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!['moderator', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Moderator privileges required.'
    });
  }

  next();
};

// Require session host or admin
const requireHostOrAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Admin always has access
  if (req.user.role === 'admin') {
    return next();
  }

  try {
    const sessionId = req.params.id || req.params.sessionId;
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if user is the host
    const isHost = session.host.toString() === req.user._id.toString();
    
    // Check if user is a co-host
    const isCoHost = session.coHosts && 
      session.coHosts.some(coHost => coHost.toString() === req.user._id.toString());

    if (!isHost && !isCoHost) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must be the session host or an administrator.'
      });
    }

    // Attach session to request for use in controller
    req.session = session;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking permissions'
    });
  }
};

// Require resource owner or admin (for user-specific resources)
const requireOwnerOrAdmin = (userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admin always has access
    if (req.user.role === 'admin') {
      return next();
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField];

    if (req.user._id.toString() !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

// Check if user can create sessions (admin only for now)
const canCreateSession = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Only admins can create sessions per requirements
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only administrators can create sessions. Please contact an admin if you want to host a session.'
    });
  }

  next();
};

// Rate limiting helper for specific actions
const checkVoteLimit = async (req, res, next) => {
  // Implement vote rate limiting if needed
  next();
};

module.exports = {
  protect,
  optionalAuth,
  requireAdmin,
  requireRole,
  requireModerator,
  requireHostOrAdmin,
  requireOwnerOrAdmin,
  canCreateSession,
  checkVoteLimit
};
