import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

const parseBoolean = (val, defaultValue = true) => {
  if (val === undefined || val === null) return defaultValue;
  if (typeof val === 'boolean') return val;
  const str = String(val).trim().toLowerCase();
  if (str === 'yes' || str === 'true' || str === '1') return true;
  if (str === 'no' || str === 'false' || str === '0') return false;
  return defaultValue;
};

export const getUsers = async (req, res, next) => {
  try {
    const { search, status, isSpammer, page = 1, limit = 50 } = req.query;

    const query = { isDeleted: { $ne: true } };

    if (search && search.trim()) {
      const s = search.trim();
      const sRegex = new RegExp(s, 'i');
      query.$or = [
        { fullName: sRegex },
        { username: sRegex },
        { loginId: sRegex },
        { email: sRegex },
        { agencyName: sRegex },
        { companyName: sRegex },
        { contactNumber: sRegex }
      ];
    }

    if (status && status !== 'all') {
      query.status = status.toUpperCase();
    }

    if (isSpammer !== undefined && isSpammer !== 'all') {
      query.isSpammer = parseBoolean(isSpammer, false);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [total, rawUsers] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('-verificationCode -verificationCodeExpires -resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    const users = rawUsers.map(u => ({
      ...u,
      plainPassword: u.plainPassword || (u.password && !u.password.startsWith('$2') && u.password.length < 30 ? u.password : '') || ''
    }));

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const {
      loginId,
      username,
      password,
      name,
      fullName,
      companyName,
      contactNo,
      contactNumber,
      email,
      address,
      city,
      activeDate,
      inactiveDate,
      agencyName,
      status,
      userType,
      aiAssistant,
      alreadyLogin,
      isSpammer,
      ipRestriction,
      displayStatute,
      displayNotification,
      displayCase,
      allowAllForms,
      role = 'User'
    } = req.body;

    const finalLogin = (loginId || username || email || '').trim();
    const finalEmail = (email || (finalLogin.includes('@') ? finalLogin : `${finalLogin}@sldsystem.com`)).trim().toLowerCase();
    const finalName = (name || fullName || finalLogin).trim();

    if (!finalLogin) {
      return res.status(400).json({ success: false, message: 'Login ID / Email is required.' });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: 'Login Password is required.' });
    }

    // Security constraint: Only existing Administrators can assign Administrator role
    const assignedRole = (role === 'Administrator' && req.user?.role === 'Administrator') ? 'Administrator' : 'User';

    const existing = await User.findOne({
      $or: [
        { username: finalLogin },
        { email: finalEmail },
        { loginId: finalLogin }
      ]
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this Login ID or Email already exists.' });
    }

    const user = new User({
      loginId: finalLogin,
      username: finalLogin,
      email: finalEmail,
      password, // will be hashed by pre-save hook
      plainPassword: password,
      fullName: finalName,
      companyName: companyName ? companyName.trim() : '',
      contactNumber: (contactNo || contactNumber || '').trim(),
      address: address ? address.trim() : '',
      city: city ? city.trim() : '',
      activeDate: activeDate ? new Date(activeDate) : new Date(),
      inactiveDate: inactiveDate ? new Date(inactiveDate) : null,
      agencyName: agencyName ? agencyName.trim() : 'General',
      status: (status || 'Active').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      userType: userType || 'Special',
      aiAssistant: parseBoolean(aiAssistant, true),
      alreadyLogin: parseBoolean(alreadyLogin, false),
      isSpammer: parseBoolean(isSpammer, false),
      ipRestriction: parseBoolean(ipRestriction, false),
      displayStatute: parseBoolean(displayStatute, true),
      displayNotification: parseBoolean(displayNotification, true),
      displayCase: parseBoolean(displayCase, true),
      allowAllForms: parseBoolean(allowAllForms, false),
      role: assignedRole,
      isVerified: true,
    });

    await user.save();
    logger.info(`[User Created] Admin created user: ${user.username} (${user.email})`);

    const userObj = user.toObject();
    delete userObj.password;

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userObj
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const {
      loginId,
      username,
      password,
      name,
      fullName,
      companyName,
      contactNo,
      contactNumber,
      email,
      address,
      city,
      activeDate,
      inactiveDate,
      agencyName,
      status,
      userType,
      aiAssistant,
      alreadyLogin,
      isSpammer,
      ipRestriction,
      displayStatute,
      displayNotification,
      displayCase,
      allowAllForms,
      role
    } = req.body;

    if (username !== undefined || loginId !== undefined) {
      const newLogin = (loginId || username || '').trim();
      if (newLogin && newLogin !== user.username) {
        const exist = await User.findOne({ username: newLogin, _id: { $ne: id } });
        if (exist) {
          return res.status(400).json({ success: false, message: 'Login ID already taken by another user.' });
        }
        user.username = newLogin;
        user.loginId = newLogin;
      }
    }

    if (email !== undefined) {
      const newEmail = email.trim().toLowerCase();
      if (newEmail && newEmail !== user.email) {
        const exist = await User.findOne({ email: newEmail, _id: { $ne: id } });
        if (exist) {
          return res.status(400).json({ success: false, message: 'Email address already taken by another user.' });
        }
        user.email = newEmail;
      }
    }

    if (password && password.trim()) {
      user.password = password.trim(); // pre-save hook will hash
      user.plainPassword = password.trim();
    }

    if (name !== undefined || fullName !== undefined) {
      user.fullName = (name || fullName || user.fullName).trim();
    }
    if (companyName !== undefined) user.companyName = companyName.trim();
    if (contactNo !== undefined || contactNumber !== undefined) {
      user.contactNumber = (contactNo || contactNumber || '').trim();
    }
    if (address !== undefined) user.address = address.trim();
    if (city !== undefined) user.city = city.trim();
    if (activeDate !== undefined) user.activeDate = activeDate ? new Date(activeDate) : user.activeDate;
    if (inactiveDate !== undefined) user.inactiveDate = inactiveDate ? new Date(inactiveDate) : null;
    if (agencyName !== undefined) user.agencyName = agencyName.trim();
    if (status !== undefined) user.status = String(status).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (userType !== undefined) user.userType = userType;
    if (role !== undefined) user.role = role;

    if (aiAssistant !== undefined) user.aiAssistant = parseBoolean(aiAssistant, user.aiAssistant);
    if (alreadyLogin !== undefined) user.alreadyLogin = parseBoolean(alreadyLogin, user.alreadyLogin);
    if (isSpammer !== undefined) user.isSpammer = parseBoolean(isSpammer, user.isSpammer);
    if (ipRestriction !== undefined) user.ipRestriction = parseBoolean(ipRestriction, user.ipRestriction);
    if (displayStatute !== undefined) user.displayStatute = parseBoolean(displayStatute, user.displayStatute);
    if (displayNotification !== undefined) user.displayNotification = parseBoolean(displayNotification, user.displayNotification);
    if (displayCase !== undefined) user.displayCase = parseBoolean(displayCase, user.displayCase);
    if (allowAllForms !== undefined) user.allowAllForms = parseBoolean(allowAllForms, user.allowAllForms);

    await user.save();
    logger.info(`[User Updated] Admin updated user: ${user.username}`);

    const userObj = user.toObject();
    delete userObj.password;

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: userObj
    });
  } catch (error) {
    next(error);
  }
};

export const toggleSpammer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isSpammer = !user.isSpammer;
    await user.save();

    logger.info(`[Spammer Status Changed] User ${user.username} isSpammer set to ${user.isSpammer}`);

    return res.status(200).json({
      success: true,
      message: user.isSpammer ? `User marked as Spammer (Dummy data active)` : `User unmarked as Spammer`,
      data: { id: user._id, username: user.username, isSpammer: user.isSpammer }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: { id }
    });
  } catch (error) {
    next(error);
  }
};
