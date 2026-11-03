const { ZodError } = require('zod');

class AppError extends Error {
  constructor(message, status = 400, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function ok(res, data = null, meta = null, status = 200) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

function fail(res, error) {
  if (error instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }
  if (error instanceof AppError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      details: error.details,
    });
  }
  console.error(error);
  return res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again later.',
  });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { AppError, ok, fail, asyncHandler };
