/**
 * Wraps an async Express handler so thrown errors / rejected promises are
 * forwarded to next(err) automatically, instead of every controller needing
 * its own try/catch block.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
