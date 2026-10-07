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

/**
 * Middleware to require Administrator role OR allowAllForms privilege
 */
export const requireAdminOrAllForms = (req, res, next) => {
  if (!req.user || (req.user.role !== 'Administrator' && req.user.allowAllForms !== true)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Access restricted. You do not have permissions to perform this action.'
    });
  }
  next();
};

/**
 * Validates whether user is allowed to access Notifications
 */
export const checkNotificationAccess = (req, res, next) => {
  if (req.user && req.user.role !== 'Administrator' && !req.user.allowAllForms && req.user.displayNotification === false) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: You do not have permission to view Notifications.'
    });
  }
  next();
};

/**
 * Validates whether user is allowed to access Statutes
 */
export const checkStatuteAccess = (req, res, next) => {
  if (req.user && req.user.role !== 'Administrator' && !req.user.allowAllForms && req.user.displayStatute === false) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: You do not have permission to view Statutes.'
    });
  }
  next();
};

/**
 * Validates whether user is allowed to access Case Law
 */
export const checkCaseAccess = (req, res, next) => {
  if (req.user && req.user.role !== 'Administrator' && !req.user.allowAllForms && req.user.displayCase === false) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: You do not have permission to view Case Law.'
    });
  }
  next();
};

