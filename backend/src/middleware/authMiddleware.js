import { verifyAccessToken } from '../config/jwt.js';
import User from '../models/User.js';

/**
 * Validates JWT access token and logs user in for the request session
 */
export const protect = async (req, res, next) => {
  let token;

  // Check Authorization header for Bearer token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: No authentication token provided.'
    });
  }

  try {
    // Verify token
    const decoded = verifyAccessToken(token);

    // Fetch user details and attach to request
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Access Denied: The user account associated with this token no longer exists.'
      });
    }

    if (user.status !== 'ACTIVE' && user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Access Denied: Your account is currently ${user.status}.`
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: Authentication token is invalid or expired.',
      errors: [error.message]
    });
  }
};

/**
 * Restricts access to specific roles
 * @param {...string} roles 
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. You do not have permissions to perform this action.`
      });
    }
    next();
  };
};

/**
 * Shorthand middleware to require Administrator role
 */
export const requireAdmin = authorize('Administrator');
