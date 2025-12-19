const AppError = require('../utils/AppError');

/**
 * Middleware to verify admin role
 * Must be used after auth middleware
 */
const adminAuth = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  next();
};

/**
 * Middleware to verify moderator or admin role
 * Must be used after auth middleware
 */
const modAuth = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  if (!['moderator', 'admin'].includes(req.user.role)) {
    return next(new AppError('Moderator access required', 403));
  }

  next();
};

/**
 * Middleware to verify specific roles
 * @param  {...string} roles - Allowed roles
 */
const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(`One of the following roles required: ${roles.join(', ')}`, 403));
    }

    next();
  };
};

module.exports = {
  adminAuth,
  modAuth,
  requireRoles,
};
