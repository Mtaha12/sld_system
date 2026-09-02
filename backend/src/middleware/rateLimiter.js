import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter setup for general endpoints
 */
export const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000, // Default: max 1000 requests per window
  standardHeaders: true, // Return standard rate limit info headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after some time.'
  }
});

/**
 * Strict rate limiter for sensitive authentication endpoints (login, forgot password, register)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login or verification attempts. Please wait 15 minutes and try again.'
  }
});

/**
 * Strict limiter for chatbot requests to prevent abuse and external API overload
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many chatbot requests. Please wait a moment and try again.'
  }
});
