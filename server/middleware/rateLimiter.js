/**
 * Tiered Rate Limiting Middleware for CrowdBeat
 * Implements different limits for anonymous, authenticated, and premium users
 */

const rateLimit = require('express-rate-limit');
const { ApiError } = require('../utils/errorCodes');

// Rate limit configurations by tier
const RATE_LIMITS = {
  anonymous: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: 'Too many requests. Please sign in for higher limits.',
  },
  authenticated: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests. Please slow down.',
  },
  premium: {
    windowMs: 60 * 1000, // 1 minute
    max: 300, // 300 requests per minute
    message: 'Rate limit exceeded.',
  },
};

// Special limits for specific actions
const SPECIAL_LIMITS = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
  },
  upload: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 uploads per minute
    message: 'Too many uploads. Please wait before uploading more files.',
  },
  vote: {
    windowMs: 1000, // 1 second
    max: 5, // 5 votes per second (prevents rapid clicking)
    message: 'Voting too fast. Please slow down.',
  },
  feedback: {
    windowMs: 10 * 1000, // 10 seconds
    max: 20, // 20 words per 10 seconds
    message: 'Submitting feedback too fast. Please wait.',
  },
  ai: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 AI generations per hour
    message: 'AI generation limit reached. Please try again later.',
  },
};

/**
 * Get user tier for rate limiting
 */
const getUserTier = (req) => {
  if (!req.user) {
    return 'anonymous';
  }

  const tier = req.user.subscription?.tier;
  if (tier && tier !== 'free') {
    return 'premium';
  }

  return 'authenticated';
};

/**
 * Dynamic key generator based on user
 */
const keyGenerator = (req) => {
  if (req.user) {
    return `user:${req.user._id}`;
  }
  return `ip:${req.ip}`;
};

/**
 * Standard response handler
 */
const standardHandler = (req, res, next, options) => {
  res.status(429).json({
    success: false,
    error: {
      code: 6001,
      message: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000),
    },
  });
};

/**
 * Skip function for certain paths
 */
const skipPaths = ['/api/health', '/api/health/full'];

const shouldSkip = (req) => {
  return skipPaths.some(path => req.path.startsWith(path));
};

/**
 * Create tiered rate limiter middleware
 */
const createTieredRateLimiter = () => {
  // Create limiters for each tier
  const limiters = {
    anonymous: rateLimit({
      ...RATE_LIMITS.anonymous,
      keyGenerator,
      handler: standardHandler,
      skip: shouldSkip,
      standardHeaders: true,
      legacyHeaders: false,
    }),
    authenticated: rateLimit({
      ...RATE_LIMITS.authenticated,
      keyGenerator,
      handler: standardHandler,
      skip: shouldSkip,
      standardHeaders: true,
      legacyHeaders: false,
    }),
    premium: rateLimit({
      ...RATE_LIMITS.premium,
      keyGenerator,
      handler: standardHandler,
      skip: shouldSkip,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  };

  return (req, res, next) => {
    const tier = getUserTier(req);
    return limiters[tier](req, res, next);
  };
};

/**
 * Auth-specific rate limiter (stricter for security)
 */
const authRateLimiter = rateLimit({
  ...SPECIAL_LIMITS.auth,
  keyGenerator: (req) => `auth:${req.ip}`,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 6001,
        message: SPECIAL_LIMITS.auth.message,
        retryAfter: Math.ceil(SPECIAL_LIMITS.auth.windowMs / 1000),
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Upload rate limiter
 */
const uploadRateLimiter = rateLimit({
  ...SPECIAL_LIMITS.upload,
  keyGenerator,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 6001,
        message: SPECIAL_LIMITS.upload.message,
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Vote rate limiter (prevents rapid clicking)
 */
const voteRateLimiter = rateLimit({
  ...SPECIAL_LIMITS.vote,
  keyGenerator,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 6002,
        message: SPECIAL_LIMITS.vote.message,
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Feedback rate limiter
 */
const feedbackRateLimiter = rateLimit({
  ...SPECIAL_LIMITS.feedback,
  keyGenerator,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 6002,
        message: SPECIAL_LIMITS.feedback.message,
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * AI generation rate limiter
 */
const aiRateLimiter = rateLimit({
  ...SPECIAL_LIMITS.ai,
  keyGenerator,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 6001,
        message: SPECIAL_LIMITS.ai.message,
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Create the default rate limiter instance
const applyRateLimiting = createTieredRateLimiter();

module.exports = {
  createTieredRateLimiter,
  applyRateLimiting,
  authRateLimiter,
  uploadRateLimiter,
  voteRateLimiter,
  feedbackRateLimiter,
  aiRateLimiter,
  RATE_LIMITS,
  SPECIAL_LIMITS,
};
