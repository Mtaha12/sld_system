/**
 * Shared case-insensitive user lookup utilities for authentication flows.
 * Usernames, emails, and login IDs match case-insensitively while passwords stay strictly case-sensitive.
 */

export const escapeUserRegex = (str) => String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Resolves a User by email, username, or loginId without case sensitivity.
 * Tries exact/indexed values first before anchored case-insensitive regex matching.
 */
export const findUserByIdentifier = async (UserModel, rawIdentifier, extraFilter = {}, projection = null) => {
  const trimmed = String(rawIdentifier || '').trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();

  let exactQuery = UserModel.findOne({
    ...extraFilter,
    $or: [
      { email: lowered },
      { username: trimmed },
      { username: lowered },
      { loginId: trimmed },
      { loginId: lowered },
    ],
  });
  if (projection) exactQuery = exactQuery.select(projection);

  const exactMatch = await exactQuery;
  if (exactMatch) return exactMatch;

  const ciRegex = new RegExp(`^${escapeUserRegex(trimmed)}$`, 'i');
  let ciQuery = UserModel.findOne({
    ...extraFilter,
    $or: [
      { email: ciRegex },
      { username: ciRegex },
      { loginId: ciRegex },
    ],
  });
  if (projection) ciQuery = ciQuery.select(projection);

  return ciQuery;
};

/**
 * Checks whether a username is already taken (case-insensitively).
 */
export const findExistingUserByUsername = async (UserModel, username, excludeUserId = null) => {
  const trimmed = String(username || '').trim();
  if (!trimmed) return null;

  const filter = {
    username: new RegExp(`^${escapeUserRegex(trimmed)}$`, 'i'),
  };
  if (excludeUserId) {
    filter._id = { $ne: excludeUserId };
  }
  return UserModel.findOne(filter);
};

