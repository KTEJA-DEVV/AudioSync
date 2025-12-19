/**
 * Request Validation and Sanitization Middleware
 */

const { body, param, query, validationResult } = require('express-validator');
const xss = require('xss');
const { ApiError } = require('../utils/errorCodes');

/**
 * XSS sanitization options
 */
const xssOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script'],
};

/**
 * Sanitize string input
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return xss(value.trim(), xssOptions);
};

/**
 * Sanitize object recursively
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Middleware to sanitize all request inputs
 */
const sanitizeInputs = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

/**
 * Validation error handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 3001,
        message: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value,
        })),
      },
    });
  }
  
  next();
};

// ==================== Validation Chains ====================

/**
 * Auth validation rules
 */
const authValidation = {
  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3-30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
  ],
  
  login: [
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  
  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
};

/**
 * Session validation rules
 */
const sessionValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be 3-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    body('genre')
      .optional()
      .isIn(['pop', 'rock', 'hip-hop', 'electronic', 'r&b', 'country', 'jazz', 'classical', 'indie', 'other'])
      .withMessage('Invalid genre'),
    body('maxParticipants')
      .optional()
      .isInt({ min: 2, max: 1000 })
      .withMessage('Max participants must be 2-1000'),
  ],
  
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid session ID'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be 3-100 characters'),
  ],
};

/**
 * Lyrics validation rules
 */
const lyricsValidation = {
  submit: [
    param('id')
      .isMongoId()
      .withMessage('Invalid session ID'),
    body('content.fullLyrics')
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage('Lyrics must be 10-5000 characters'),
    body('content.title')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Title cannot exceed 100 characters'),
  ],
};

/**
 * Vote validation rules
 */
const voteValidation = {
  cast: [
    param('id')
      .isMongoId()
      .withMessage('Invalid target ID'),
    body('value')
      .optional()
      .isInt({ min: -1, max: 1 })
      .withMessage('Vote value must be -1, 0, or 1'),
  ],
};

/**
 * Report validation rules
 */
const reportValidation = {
  create: [
    body('targetType')
      .isIn(['user', 'submission', 'song', 'message', 'session', 'comment', 'stem'])
      .withMessage('Invalid target type'),
    body('targetId')
      .isMongoId()
      .withMessage('Invalid target ID'),
    body('reason')
      .isIn(['spam', 'inappropriate', 'harassment', 'copyright', 'hate-speech', 'violence', 'misinformation', 'other'])
      .withMessage('Invalid reason'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
  ],
};

/**
 * Tip validation rules
 */
const tipValidation = {
  send: [
    body('to')
      .isMongoId()
      .withMessage('Invalid recipient ID'),
    body('amount')
      .isFloat({ min: 0.01, max: 1000 })
      .withMessage('Amount must be between $0.01 and $1000'),
    body('message')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Message cannot exceed 200 characters'),
  ],
};

/**
 * Pagination validation
 */
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1-100'),
  query('sortBy')
    .optional()
    .isString()
    .withMessage('SortBy must be a string'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

/**
 * MongoDB ID validation
 */
const mongoIdValidation = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
];

module.exports = {
  sanitizeInputs,
  sanitizeString,
  sanitizeObject,
  handleValidationErrors,
  authValidation,
  sessionValidation,
  lyricsValidation,
  voteValidation,
  reportValidation,
  tipValidation,
  paginationValidation,
  mongoIdValidation,
};

