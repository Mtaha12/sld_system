import logger from '../utils/logger.js';

/**
 * Centered error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected error occurred on the server.';
  let errors = err.errors || [];

  // Log the complete error stack internally
  logger.error(`${req.method} ${req.originalUrl} - Error: ${err.message}`, { stack: err.stack });

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const validationMsgs = Object.values(err.errors).map(val => val.message);
    message = validationMsgs.length > 0 ? validationMsgs.join('. ') : 'Validation Failed';
    errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
  }

  // Handle Mongoose Duplicate Key (Unique Constraint) Error
  if (err.code === 11000) {
    statusCode = 400;
    const key = Object.keys(err.keyValue)[0];
    message = `Duplicate value error: ${key} already exists.`;
    errors = [{
      field: key,
      message: `The value for field '${key}' is already registered.`
    }];
  }

  // Handle Mongoose CastError (e.g. invalid ID format)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field ${err.path}: '${err.value}'`;
    errors = [{
      field: err.path,
      message: `Unable to cast value '${err.value}' to type '${err.kind}'`
    }];
  }

  // Handle JWT Error
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Authentication token is invalid.';
  }

  // Handle JWT Expiry
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired.';
  }

  // Send formatted JSON error response
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};

export default errorHandler;
