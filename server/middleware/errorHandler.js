// Error codes for consistent error responses
const ErrorCodes = {
  // Authentication errors (1xxx)
  UNAUTHORIZED: 'AUTH_001',
  INVALID_TOKEN: 'AUTH_002',
  TOKEN_EXPIRED: 'AUTH_003',
  INVALID_CREDENTIALS: 'AUTH_004',
  
  // Validation errors (2xxx)
  VALIDATION_ERROR: 'VAL_001',
  INVALID_INPUT: 'VAL_002',
  MISSING_FIELD: 'VAL_003',
  INVALID_FORMAT: 'VAL_004',
  
  // Resource errors (3xxx)
  NOT_FOUND: 'RES_001',
  ALREADY_EXISTS: 'RES_002',
  CONFLICT: 'RES_003',
  
  // Permission errors (4xxx)
  FORBIDDEN: 'PERM_001',
  INSUFFICIENT_PERMISSIONS: 'PERM_002',
  
  // Rate limiting errors (5xxx)
  RATE_LIMITED: 'RATE_001',
  TOO_MANY_REQUESTS: 'RATE_002',
  
  // File errors (6xxx)
  FILE_TOO_LARGE: 'FILE_001',
  INVALID_FILE_TYPE: 'FILE_002',
  UPLOAD_FAILED: 'FILE_003',
  
  // Server errors (9xxx)
  INTERNAL_ERROR: 'SRV_001',
  DATABASE_ERROR: 'SRV_002',
  EXTERNAL_SERVICE_ERROR: 'SRV_003',
};

// Custom application error class
class AppError extends Error {
  constructor(message, statusCode = 500, code = ErrorCodes.INTERNAL_ERROR, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error response formatter
const formatErrorResponse = (error, includeStack = false) => {
  const response = {
    success: false,
    error: {
      message: error.message || 'An unexpected error occurred',
      code: error.code || ErrorCodes.INTERNAL_ERROR,
    },
  };

  if (error.details) {
    response.error.details = error.details;
  }

  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
};

// Main error handler middleware
const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let code = err.code || ErrorCodes.INTERNAL_ERROR;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.name === 'CastError') {
    // Mongoose cast error (invalid ObjectId)
    statusCode = 400;
    code = ErrorCodes.INVALID_FORMAT;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    code = ErrorCodes.ALREADY_EXISTS;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = ErrorCodes.INVALID_TOKEN;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = ErrorCodes.TOKEN_EXPIRED;
    message = 'Token has expired';
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message,
      code,
      statusCode,
      stack: err.stack,
    });
  }

  // Send response
  const includeStack = process.env.NODE_ENV === 'development';
  const errorResponse = formatErrorResponse(
    { message, code, details, stack: err.stack },
    includeStack
  );

  res.status(statusCode).json(errorResponse);
};

// Async handler wrapper to catch async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  ErrorCodes,
  AppError,
  errorHandler,
  asyncHandler,
  formatErrorResponse,
};
