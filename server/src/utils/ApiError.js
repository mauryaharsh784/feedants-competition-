/**
 * A typed error carrying an HTTP status code and a machine-readable code,
 * so the centralized error middleware can translate it into a safe,
 * consistent JSON response without leaking internals.
 */
class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isApiError = true;
  }

  static badRequest(message, code = 'BAD_REQUEST') {
    return new ApiError(400, message, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  static conflict(message, code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }

  static forbidden(message, code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }

  static internal(message = 'Something went wrong', code = 'INTERNAL_ERROR') {
    return new ApiError(500, message, code);
  }
}

module.exports = ApiError;
