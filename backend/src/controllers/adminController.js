import User from '../models/User.js';
import logger from '../utils/logger.js';

export const getAdmins = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const query = {
      role: 'Administrator',
      isDeleted: { $ne: true }
    };

    if (search && search.trim()) {
      const sRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: sRegex },
        { username: sRegex },
        { loginId: sRegex },
        { email: sRegex },
        { contactNumber: sRegex }
      ];
    }

    if (status && status !== 'all' && status !== 'Select Status') {
      query.status = status.toUpperCase();
    }

    const admins = await User.find(query)
      .select('-password -verificationCode -verificationCodeExpires -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      total: admins.length,
      data: admins
    });
  } catch (error) {
    next(error);
  }
};

export const createAdmin = async (req, res, next) => {
  try {
    // Unique Admin Security Guard: Verify requester is verified active Administrator in database
    const requester = await User.findById(req.user.id || req.user._id);
    if (!requester || requester.role !== 'Administrator' || requester.isDeleted) {
      logger.warn(`[Security Alert] Unauthorized attempt to create admin by: ${req.user?.username || 'Unknown'}`);
      return res.status(403).json({
        success: false,
        message: 'Security Violation: Only authenticated administrators can create admin accounts.'
      });
    }

    const { fullName, loginId, password, email, phoneNo, contactNumber, userType, status } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Full Name is required.' });
    }
    if (!loginId || !loginId.trim()) {
      return res.status(400).json({ success: false, message: 'Login ID / Email is required.' });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ success: false, message: 'Login Password is required.' });
    }
    if (!phoneNo && !contactNumber) {
      return res.status(400).json({ success: false, message: 'Phone No. is required.' });
    }

    const cleanLogin = loginId.trim();
    const cleanEmail = (email || (cleanLogin.includes('@') ? cleanLogin : `${cleanLogin}@sldsystem.com`)).trim().toLowerCase();

    const existing = await User.findOne({
      $or: [
        { username: cleanLogin },
        { loginId: cleanLogin },
        { email: cleanEmail }
      ]
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'An administrator with this Login ID or Email already exists.' });
    }

    const admin = new User({
      fullName: fullName.trim(),
      username: cleanLogin,
      loginId: cleanLogin,
      email: cleanEmail,
      password: password.trim(), // Pre-save hook hashes
      contactNumber: (phoneNo || contactNumber || '').trim(),
      userType: userType && userType !== 'Select Type' ? userType : 'Super Admin',
      status: (status || 'Active').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      role: 'Administrator',
      isVerified: true,
      aiAssistant: true,
      displayCase: true,
      displayNotification: true,
      displayStatute: true,
    });

    await admin.save();
    logger.info(`[Admin Created] Created administrator: ${admin.username} (${admin.email})`);

    const adminObj = admin.toObject();
    delete adminObj.password;

    return res.status(201).json({
      success: true,
      message: 'Administrator created successfully',
      data: adminObj
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin = await User.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Administrator not found' });
    }

    const { fullName, loginId, password, email, phoneNo, contactNumber, userType, status } = req.body;

    if (fullName !== undefined) admin.fullName = fullName.trim();
    if (loginId !== undefined && loginId.trim()) {
      const cleanLogin = loginId.trim();
      if (cleanLogin !== admin.username) {
        const exist = await User.findOne({ username: cleanLogin, _id: { $ne: id } });
        if (exist) {
          return res.status(400).json({ success: false, message: 'Login ID already taken.' });
        }
        admin.username = cleanLogin;
        admin.loginId = cleanLogin;
      }
    }
    if (email !== undefined && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== admin.email) {
        const exist = await User.findOne({ email: cleanEmail, _id: { $ne: id } });
        if (exist) {
          return res.status(400).json({ success: false, message: 'Email address already taken.' });
        }
        admin.email = cleanEmail;
      }
    }
    if (password && password.trim()) {
      admin.password = password.trim();
    }
    if (phoneNo !== undefined || contactNumber !== undefined) {
      admin.contactNumber = (phoneNo || contactNumber || '').trim();
    }
    if (userType && userType !== 'Select Type') {
      admin.userType = userType;
    }
    if (status && status !== 'Select Status') {
      admin.status = status.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    }

    await admin.save();
    logger.info(`[Admin Updated] Updated administrator: ${admin.username}`);

    const adminObj = admin.toObject();
    delete adminObj.password;

    return res.status(200).json({
      success: true,
      message: 'Administrator updated successfully',
      data: adminObj
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin = await User.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Administrator not found' });
    }

    // Safety: check if this is the only super admin
    const adminCount = await User.countDocuments({ role: 'Administrator', isDeleted: { $ne: true } });
    if (adminCount <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete the sole remaining administrator.' });
    }

    admin.isDeleted = true;
    admin.deletedAt = new Date();
    await admin.save();

    return res.status(200).json({
      success: true,
      message: 'Administrator deleted successfully',
      data: { id }
    });
  } catch (error) {
    next(error);
  }
};
