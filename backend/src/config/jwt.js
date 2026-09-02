import 'dotenv/config';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_sld_access_token_key_128_bits';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_sld_refresh_token_key_512_bits';

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
    JWT_SECRET,
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
    JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
};

/**
 * Verifies JWT Access Token
 * @param {string} token 
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Verifies JWT Refresh Token
 * @param {string} token 
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};
