/**
 * Standardized error codes and messages for the CrowdBeat API
 */

const ErrorCodes = {
  // Authentication Errors (1xxx)
  AUTH_INVALID_CREDENTIALS: {
    code: 1001,
    message: 'Invalid email or password',
    status: 401,
  },
  AUTH_TOKEN_EXPIRED: {
    code: 1002,
    message: 'Authentication token has expired',
    status: 401,
  },
  AUTH_TOKEN_INVALID: {
    code: 1003,
    message: 'Invalid authentication token',
    status: 401,
  },
  AUTH_NO_TOKEN: {
    code: 1004,
    message: 'No authentication token provided',
    status: 401,
  },
  AUTH_EMAIL_NOT_VERIFIED: {
    code: 1005,
    message: 'Please verify your email address',
    status: 403,
  },
  AUTH_ACCOUNT_BANNED: {
    code: 1006,
    message: 'Your account has been suspended',
    status: 403,
  },
  AUTH_ACCOUNT_MUTED: {
    code: 1007,
    message: 'Your account is temporarily muted',
    status: 403,
  },

  // Authorization Errors (2xxx)
  FORBIDDEN: {
    code: 2001,
    message: 'You do not have permission to perform this action',
    status: 403,
  },
  ROLE_REQUIRED: {
    code: 2002,
    message: 'Insufficient role privileges',
    status: 403,
  },
  SUBSCRIPTION_REQUIRED: {
    code: 2003,
    message: 'This feature requires an active subscription',
    status: 403,
  },
  OWNER_ONLY: {
    code: 2004,
    message: 'Only the owner can perform this action',
    status: 403,
  },

  // Validation Errors (3xxx)
  VALIDATION_FAILED: {
    code: 3001,
    message: 'Validation failed',
    status: 400,
  },
  INVALID_INPUT: {
    code: 3002,
    message: 'Invalid input provided',
    status: 400,
  },
  MISSING_REQUIRED_FIELD: {
    code: 3003,
    message: 'Required field is missing',
    status: 400,
  },
  INVALID_EMAIL_FORMAT: {
    code: 3004,
    message: 'Invalid email format',
    status: 400,
  },
  PASSWORD_TOO_WEAK: {
    code: 3005,
    message: 'Password does not meet security requirements',
    status: 400,
  },
  INVALID_FILE_TYPE: {
    code: 3006,
    message: 'Invalid file type',
    status: 400,
  },
  FILE_TOO_LARGE: {
    code: 3007,
    message: 'File size exceeds maximum allowed',
    status: 400,
  },

  // Resource Errors (4xxx)
  NOT_FOUND: {
    code: 4001,
    message: 'Resource not found',
    status: 404,
  },
  USER_NOT_FOUND: {
    code: 4002,
    message: 'User not found',
    status: 404,
  },
  SESSION_NOT_FOUND: {
    code: 4003,
    message: 'Session not found',
    status: 404,
  },
  SONG_NOT_FOUND: {
    code: 4004,
    message: 'Song not found',
    status: 404,
  },
  SUBMISSION_NOT_FOUND: {
    code: 4005,
    message: 'Submission not found',
    status: 404,
  },
  ALREADY_EXISTS: {
    code: 4010,
    message: 'Resource already exists',
    status: 409,
  },
  EMAIL_TAKEN: {
    code: 4011,
    message: 'Email address is already registered',
    status: 409,
  },
  USERNAME_TAKEN: {
    code: 4012,
    message: 'Username is already taken',
    status: 409,
  },

  // Business Logic Errors (5xxx)
  SESSION_CLOSED: {
    code: 5001,
    message: 'Session is no longer accepting submissions',
    status: 400,
  },
  VOTING_CLOSED: {
    code: 5002,
    message: 'Voting period has ended',
    status: 400,
  },
  ALREADY_VOTED: {
    code: 5003,
    message: 'You have already voted on this item',
    status: 400,
  },
  MAX_SUBMISSIONS_REACHED: {
    code: 5004,
    message: 'Maximum submission limit reached',
    status: 400,
  },
  INSUFFICIENT_REPUTATION: {
    code: 5005,
    message: 'Your reputation is too low for this action',
    status: 403,
  },
  INSUFFICIENT_BALANCE: {
    code: 5006,
    message: 'Insufficient balance for this transaction',
    status: 400,
  },
  GENERATION_IN_PROGRESS: {
    code: 5007,
    message: 'Song generation is already in progress',
    status: 400,
  },
  INVALID_SESSION_STATE: {
    code: 5008,
    message: 'Session is not in the correct state for this action',
    status: 400,
  },

  // Rate Limiting Errors (6xxx)
  RATE_LIMIT_EXCEEDED: {
    code: 6001,
    message: 'Too many requests. Please slow down.',
    status: 429,
  },
  COOLDOWN_ACTIVE: {
    code: 6002,
    message: 'Please wait before performing this action again',
    status: 429,
  },

  // Server Errors (9xxx)
  INTERNAL_ERROR: {
    code: 9001,
    message: 'An unexpected error occurred',
    status: 500,
  },
  DATABASE_ERROR: {
    code: 9002,
    message: 'Database operation failed',
    status: 500,
  },
  EXTERNAL_SERVICE_ERROR: {
    code: 9003,
    message: 'External service is unavailable',
    status: 503,
  },
  CACHE_ERROR: {
    code: 9004,
    message: 'Cache operation failed',
    status: 500,
  },
};

/**
 * Create a standardized API error
 */
class ApiError extends Error {
  constructor(errorCode, details = null, originalError = null) {
    const error = ErrorCodes[errorCode] || ErrorCodes.INTERNAL_ERROR;
    super(error.message);
    
    this.name = 'ApiError';
    this.code = error.code;
    this.status = error.status;
    this.errorCode = errorCode;
    this.details = details;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
      },
    };
  }
}

/**
 * Create error response object
 */
const createErrorResponse = (errorCode, details = null) => {
  const error = ErrorCodes[errorCode] || ErrorCodes.INTERNAL_ERROR;
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details,
      timestamp: new Date().toISOString(),
    },
  };
};

module.exports = {
  ErrorCodes,
  ApiError,
  createErrorResponse,
};

