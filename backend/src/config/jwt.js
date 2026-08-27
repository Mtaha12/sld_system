import jwt from 'jsonwebtoken';

/**
 * Generates JWT Access Token
 * @param {Object} user 
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      username: user.username, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'fallback_access_secret_128@sld',
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '1h' }
  );
};

/**
 * Generates JWT Refresh Token
 * @param {Object} user 
 */
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_512@sld',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
};

/**
 * Verifies JWT Access Token
 * @param {string} token 
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'fallback_access_secret_128@sld');
};

/**
 * Verifies JWT Refresh Token
 * @param {string} token 
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_512@sld');
};
