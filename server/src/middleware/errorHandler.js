const ApiError = require('../utils/ApiError');

/* eslint-disable no-unused-vars */

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
}

/**
 * Single place where every error in the app is translated into a safe,
 * consistent JSON shape. Never leaks stack traces, driver internals, or
 * raw MongoDB error messages to the client.
 */
function errorHandler(err, req, res, next) {
  // Known, intentional errors we raised ourselves.
  if (err.isApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // Mongoose validation errors -> 400 with field-level detail (safe to expose).
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
    });
  }

  // Invalid ObjectId cast (e.g. malformed competition id in the URL).
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: `Invalid identifier: ${err.value}` },
    });
  }

  // Duplicate key error (unique index violation) - most importantly the
  // competitionId+userId compound index that prevents double registration.
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: { code: 'ALREADY_REGISTERED', message: 'You are already registered for this competition' },
    });
  }

  // Anything unexpected: log full detail server-side, return a generic
  // message to the client so internals are never exposed.
  console.error('[error]', err);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
  });
}

module.exports = { notFoundHandler, errorHandler };
