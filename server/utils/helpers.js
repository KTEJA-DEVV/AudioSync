/**
 * Generate a random string
 * @param {number} length - Length of the string
 * @returns {string}
 */
const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate a slug from a string
 * @param {string} str - Input string
 * @returns {string}
 */
const slugify = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Format duration in seconds to mm:ss
 * @param {number} seconds
 * @returns {string}
 */
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Paginate array
 * @param {Array} array
 * @param {number} page
 * @param {number} limit
 * @returns {Object}
 */
const paginate = (array, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const total = array.length;

  return {
    data: array.slice(startIndex, endIndex),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: endIndex < total,
      hasPrev: page > 1,
    },
  };
};

/**
 * Sleep for specified milliseconds
 * @param {number} ms
 * @returns {Promise}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 * @param {Function} fn
 * @param {number} maxRetries
 * @param {number} baseDelay
 * @returns {Promise}
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }
  throw lastError;
};

/**
 * Sanitize user object for response
 * @param {Object} user
 * @returns {Object}
 */
const sanitizeUser = (user) => {
  const { password, __v, ...sanitized } = user.toObject ? user.toObject() : user;
  return sanitized;
};

module.exports = {
  generateRandomString,
  slugify,
  formatDuration,
  paginate,
  sleep,
  retryWithBackoff,
  sanitizeUser,
};

