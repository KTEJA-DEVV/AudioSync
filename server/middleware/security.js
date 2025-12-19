/**
 * Security Middleware for CrowdBeat
 * Implements various security headers and protections
 */

const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');

/**
 * Configure Helmet security headers
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for some React features
        "https://www.youtube.com",
        "https://player.twitch.tv",
        "https://embed.twitch.tv",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled-components/inline styles
        "https://fonts.googleapis.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "https://ui-avatars.com",
        "https://res.cloudinary.com",
        "https://crowdbeat-assets.s3.amazonaws.com",
      ],
      mediaSrc: [
        "'self'",
        "blob:",
        "https:",
        "https://crowdbeat-assets.s3.amazonaws.com",
      ],
      connectSrc: [
        "'self'",
        "wss:",
        "https://api.crowdbeat.com",
        process.env.NODE_ENV === 'development' ? 'ws://localhost:*' : '',
        process.env.NODE_ENV === 'development' ? 'http://localhost:*' : '',
      ].filter(Boolean),
      frameSrc: [
        "'self'",
        "https://www.youtube.com",
        "https://player.twitch.tv",
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // Required for YouTube/Twitch embeds
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

/**
 * Configure cookie settings
 */
const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

/**
 * Configure session cookie settings (for JWT tokens)
 */
const jwtCookieConfig = {
  ...cookieConfig,
  maxAge: parseInt(process.env.JWT_EXPIRE_DAYS || '7') * 24 * 60 * 60 * 1000,
};

/**
 * Refresh token cookie settings
 */
const refreshCookieConfig = {
  ...cookieConfig,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/api/auth/refresh',
};

/**
 * HTTP Parameter Pollution prevention
 */
const hppConfig = hpp({
  whitelist: [
    'sort',
    'filter',
    'fields',
    'page',
    'limit',
    'genre',
    'mood',
    'status',
  ],
});

/**
 * MongoDB query sanitization
 */
const mongoSanitizeConfig = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized MongoDB operator in field: ${key}`);
  },
});

/**
 * Custom security headers middleware
 */
const customSecurityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(self), geolocation=(), payment=()'
  );
  
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Request origin validation
 */
const validateOrigin = (allowedOrigins) => {
  return (req, res, next) => {
    const origin = req.get('origin');
    
    // Allow requests without origin (same-origin, server-to-server)
    if (!origin) {
      return next();
    }
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return next();
    }
    
    console.warn(`Blocked request from unauthorized origin: ${origin}`);
    return res.status(403).json({
      success: false,
      error: {
        code: 2001,
        message: 'Origin not allowed',
      },
    });
  };
};

/**
 * Request size limiter for different content types
 */
const requestSizeLimits = {
  json: '1mb',
  urlencoded: '1mb',
  text: '1mb',
  raw: '10mb', // For file uploads
};

/**
 * Slow loris attack prevention
 */
const connectionTimeout = (timeout = 120000) => {
  return (req, res, next) => {
    req.setTimeout(timeout, () => {
      res.status(408).json({
        success: false,
        error: {
          code: 9001,
          message: 'Request timeout',
        },
      });
    });
    next();
  };
};

module.exports = {
  helmetConfig,
  cookieConfig,
  jwtCookieConfig,
  refreshCookieConfig,
  hppConfig,
  mongoSanitizeConfig,
  customSecurityHeaders,
  validateOrigin,
  requestSizeLimits,
  connectionTimeout,
};

