const ApiError = require('../utils/ApiError');

/**
 * This assignment does not include a full authentication system, but every
 * registration action still needs a real, trusted user identity - it must
 * NEVER be trusted from the request body (see SECURITY section of the spec).
 *
 * We simulate an authenticated session the same way a mobile app would
 * attach a verified identity: via a request header populated after login.
 * Swapping this middleware for real JWT/session verification later requires
 * no changes anywhere else in the codebase, since controllers only ever
 * read `req.userId`.
 */
function attachUser(req, res, next) {
  const userId = req.header('x-user-id');

  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return next(ApiError.badRequest('Missing x-user-id header (mock authentication for this assignment)', 'MISSING_USER'));
  }

  req.userId = userId.trim();
  next();
}

module.exports = { attachUser };
