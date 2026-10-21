/**
 * High-Speed NoSQL Query Injection Sanitizer Middleware
 * Strips prohibited keys starting with '$' or containing '.' from req.body, req.query, and req.params
 * to prevent NoSQL operator injection while maintaining 100% backward compatibility for valid values.
 */

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = sanitizeObject(obj[i]);
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    // Prohibit keys that start with '$' or contain '.'
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else {
      obj[key] = sanitizeObject(obj[key]);
    }
  }

  return obj;
};

export const sanitizeNoSql = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
};

export default sanitizeNoSql;
