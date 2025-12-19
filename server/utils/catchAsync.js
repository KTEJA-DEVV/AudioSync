/**
 * Async Error Wrapper for CrowdBeat Controllers
 * Catches errors in async functions and passes them to Express error handler
 */

const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;

