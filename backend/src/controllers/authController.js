import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../config/jwt.js';
import { sendAdminContactEmail } from '../../services/emailService.js';
import logger from '../utils/logger.js';
import nodemailer from 'nodemailer';

/**
 * Helper to dispatch OTP emails to users
 */
const sendOtpEmail = async (email, fullName, code, type = 'verification') => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  const subject = type === 'verification' 
    ? '[SLD System] Verify Your Email Address' 
    : '[SLD System] Reset Your Password';

  const messageText = type === 'verification'
    ? `Hello ${fullName},\n\nYour SLD System verification OTP code is: ${code}\nThis code will expire in 15 minutes.\n\nRegards,\nSLD Administration`
    : `Hello ${fullName},\n\nWe received a request to reset your password. Use the following code to proceed:\n\nOTP Code: ${code}\nThis code will expire in 15 minutes.\n\nRegards,\nSLD Administration`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #E5E7EB; border-radius: 8px;">
      <h2 style="color: #E55C41; text-align: center;">SLD Law Portal</h2>
      <p>Hello <strong>${fullName}</strong>,</p>
      <p>${type === 'verification' ? 'Thank you for registering with SLD System. Please verify your email using this code:' : 'We received a request to reset your password. Please use this verification code:'}</p>
      <div style="background: #F9FAFB; border: 1px dashed #E55C41; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #111827; margin: 20px 0; border-radius: 6px;">
        ${code}
      </div>
      <p style="font-size: 12px; color: #6B7280; text-align: center;">This code is valid for 15 minutes. If you did not request this action, please ignore this email.</p>
    </div>
  `;

  if (!user || !pass) {
    logger.warn('\n------------------ [SMTP SIMULATION / OTP CODE] ------------------');
    logger.warn(`[OTP Code to ${email}]: ${code} (Type: ${type})`);
    logger.warn('------------------------------------------------------------------\n');
    return { simulated: true };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' }
  });

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'SLD System Support'}" <${process.env.EMAIL_FROM_ADDRESS || user}>`,
    to: email,
    subject,
    text: messageText,
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`[SMTP Success] OTP email dispatched to ${email}`);
    return { simulated: false };
  } catch (err) {
    logger.error(`[SMTP Error] Failed to send OTP to ${email}: ${err.message}`);
    throw new Error(`SMTP Mail delivery failed: ${err.message}`);
  }
};

/**
 * Controller methods for User account handling
 */
export const register = async (req, res, next) => {
  try {
    const { fullName, username, email, password, contactNumber, city, companyName, address } = req.body;

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'all', message: 'Full Name, Username, Email, and Password are required.' }]
      });
    }

    // Check unique criteria
    const emailExist = await User.findOne({ email: email.toLowerCase() });
    if (emailExist) {
      return res.status(400).json({
        success: false,
        message: 'Email address is already in use. Please check your credentials or use a different email.',
        errors: [{ field: 'email', message: 'Email address is already in use. Please use a different email.' }]
      });
    }

    const usernameExist = await User.findOne({ username });
    if (usernameExist) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken. Please choose a different username.',
        errors: [{ field: 'username', message: 'Username is already taken. Please choose a different username.' }]
      });
    }

    // Generate random 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Create user object
    const user = new User({
      fullName,
      username,
      email: email.toLowerCase(),
      password, // pre-save hook will hash it
      contactNumber,
      city,
      companyName,
      address,
      verificationCode,
      verificationCodeExpires,
      isVerified: false,
      status: 'active'
    });

    await user.save();

    // Dispatch email
    await sendOtpEmail(user.email, user.fullName, verificationCode, 'verification');

    const hasSmtp = process.env.SMTP_USER && process.env.SMTP_PASS;

    return res.status(201).json({
      success: true,
      message: hasSmtp 
        ? 'Account registered successfully. Please verify using the code sent to your email.'
        : `[SIMULATION MODE] Account registered. OTP code is: ${verificationCode}`,
      data: {
        username: user.username,
        email: user.email,
        ...(!hasSmtp ? { otpCode: verificationCode } : {})
      }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { code, email } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'OTP Code is required.'
      });
    }

    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    } else {
      // Fallback search by active code if email wasn't passed (safety constraint)
      user = await User.findOne({ 
        verificationCode: code, 
        verificationCodeExpires: { $gt: new Date() } 
      });
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request or session expired. Register again.'
      });
    }

    if (user.verificationCode !== code || user.verificationCodeExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification failed: Code is invalid or has expired.'
      });
    }

    // Mark verified
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Email address has been successfully verified. You can now login.'
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerificationCode = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.verificationCodeExpires = verificationCodeExpires;
    await user.save();

    await sendOtpEmail(user.email, user.fullName, verificationCode, 'verification');

    return res.status(200).json({
      success: true,
      message: hasSmtp
        ? 'A new verification code has been dispatched to your email address.'
        : `[SIMULATION MODE] A new OTP code is: ${verificationCode}`,
      data: {
        ...(!hasSmtp ? { otpCode: verificationCode } : {})
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email and Password are required.'
      });
    }

    // Search by username or email
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username and password.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username and password.'
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Your email address is not verified. Please verify first.',
        unverified: true,
        email: user.email
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    logger.info(`[Login Success] User ${user.username} logged in.`);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        userId: user.userId || user.user_id || '',
        user_id: user.user_id || user.userId || '',
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        contactNumber: user.contactNumber,
        city: user.city,
        companyName: user.companyName,
        address: user.address,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Email or Username is required.'
      });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    });

    if (!user) {
      // Security best practice: don't disclose user doesn't exist
      return res.status(200).json({
        success: true,
        message: 'If the account is registered, a password reset code has been sent.',
        email: identifier.includes('@') ? identifier.toLowerCase() : ''
      });
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    // Dispatch email
    await sendOtpEmail(user.email, user.fullName, resetToken, 'reset');

    const hasSmtp = process.env.SMTP_USER && process.env.SMTP_PASS;

    return res.status(200).json({
      success: true,
      message: hasSmtp 
        ? 'If the account is registered, a password reset OTP has been sent.'
        : `[SIMULATION MODE] Password reset code is: ${resetToken}`,
      email: user.email,
      data: {
        ...(!hasSmtp ? { otpCode: resetToken } : {})
      }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, identifier, otp, code } = req.body;
    const searchId = (email || identifier || '').trim();
    const token = (otp || code || '').trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'OTP verification code is required.'
      });
    }

    let user;
    if (searchId) {
      user = await User.findOne({
        $or: [
          { email: searchId.toLowerCase() },
          { username: searchId }
        ]
      });
    } else {
      user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() }
      });
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request or user account not found.'
      });
    }

    if (!user.resetPasswordToken || user.resetPasswordToken !== token || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification failed: OTP code is invalid or has expired.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You may now set your new password.',
      email: user.email,
      resetToken: token
    });
  } catch (error) {
    next(error);
  }
};

export const getResetPasswordForm = async (req, res, next) => {
  // Renders a simple HTML fallback page for password reset
  const { token } = req.query;
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reset Password - SLD Law Portal</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: sans-serif; background-color: #0b0c10; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background-color: #14151a; border: 1px solid #e55c41; padding: 30px; border-radius: 12px; width: 100%; max-width: 400px; text-align: center; }
        input { width: 100%; padding: 12px; margin: 10px 0; box-sizing: border-box; border-radius: 8px; border: 1px solid #262833; background: #0b0c10; color: #fff; }
        button { background-color: #e55c41; color: white; padding: 12px; border: none; width: 100%; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 16px; }
        button:hover { background-color: #d44e35; }
        h2 { margin-top: 0; color: #e55c41; }
        p { color: #888; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>SLD Law System</h2>
        <p>Enter your OTP token and your new password to reset.</p>
        <form action="/api/auth/reset-password" method="POST">
          <input type="text" name="token" placeholder="OTP Reset Token" value="${token || ''}" required />
          <input type="password" name="newPassword" placeholder="New Password" required minlength="8" />
          <button type="submit">Reset Password</button>
        </form>
      </div>
    </body>
    </html>
  `);
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, otp, email, identifier, newPassword, confirmPassword } = req.body;
    const resetCode = (token || otp || '').trim();
    const targetId = (email || identifier || '').trim();

    if (!resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'OTP Code and New Password are required.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    let user;
    if (targetId) {
      user = await User.findOne({
        $or: [
          { email: targetId.toLowerCase() },
          { username: targetId }
        ],
        resetPasswordToken: resetCode,
        resetPasswordExpires: { $gt: new Date() }
      });
    } else {
      user = await User.findOne({
        resetPasswordToken: resetCode,
        resetPasswordExpires: { $gt: new Date() }
      });
    }

    if (!user) {
      // If request from browser form submit (Accept text/html)
      if (req.headers.accept && req.headers.accept.includes('text/html') && req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
        return res.status(400).send(`
          <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #0b0c10; color: #fff; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <h2 style="color: #e55c41;">Reset Token Invalid or Expired</h2>
            <p>The code is either incorrect, expired, or has already been used.</p>
            <a href="/login" style="color: #e55c41; text-decoration: none; font-weight: bold;">Back to Login</a>
          </div>
        `);
      }

      return res.status(400).json({
        success: false,
        message: 'Password reset failed: OTP code is invalid, expired, or has already been used.'
      });
    }

    // Update password securely (User.js pre-save hook will hash with bcrypt 12-round salt)
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    if (req.headers.accept && req.headers.accept.includes('text/html') && req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      return res.status(200).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #0b0c10; color: #fff; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <h2 style="color: #22c55e;">Password Reset Successful</h2>
          <p>Your password has been successfully updated. You can now close this tab and log in at the portal.</p>
          <a href="/login" style="color: #e55c41; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 15px;">Go to Portal Login</a>
        </div>
      `);
    }

    return res.status(200).json({
      success: true,
      message: 'Password has been successfully updated. You can now log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const { profile, isSimulated } = req.body;

    if (!profile || !profile.email) {
      return res.status(400).json({
        success: false,
        message: 'Google profile payload is invalid.'
      });
    }

    const email = profile.email.toLowerCase();
    let user = await User.findOne({ email });

    // If Google user does not exist in the database, automatically register them as unverified Administrator, requiring OTP!
    if (!user) {
      const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 5);
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      user = new User({
        fullName: profile.name || 'Google User',
        username,
        email,
        password: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        isVerified: false,
        role: 'Administrator',
        avatarUrl: profile.picture || '',
        verificationCode,
        verificationCodeExpires,
        status: 'active'
      });
      await user.save();
      logger.info(`[Google Auto-Signup] Created unverified user ${user.username} from Google Login.`);

      // Dispatch OTP email
      await sendOtpEmail(user.email, user.fullName, verificationCode, 'verification');

      const hasSmtp = process.env.SMTP_USER && process.env.SMTP_PASS;

      return res.status(200).json({
        success: true,
        requiresVerification: true,
        message: hasSmtp 
          ? 'Account registered successfully. Please verify using the code sent to your Google email.'
          : `[SIMULATION MODE] Account registered. OTP code is: ${verificationCode}`,
        user: {
          id: user._id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role
        },
        data: {
          ...(!hasSmtp ? { otpCode: verificationCode } : {})
        }
      });
    }

    // For safety, simulated logins and unverified accounts ALWAYS require OTP verification!
    if (isSimulated || !user.isVerified) {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      user.verificationCode = verificationCode;
      user.verificationCodeExpires = verificationCodeExpires;
      await user.save();

      // Dispatch OTP email
      await sendOtpEmail(user.email, user.fullName, verificationCode, 'verification');

      const hasSmtp = process.env.SMTP_USER && process.env.SMTP_PASS;

      return res.status(200).json({
        success: true,
        requiresVerification: true,
        message: hasSmtp 
          ? 'Verification OTP has been sent to your Google email.'
          : `[SIMULATION MODE] Verification code generated. OTP code is: ${verificationCode}`,
        user: {
          id: user._id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role
        },
        data: {
          ...(!hasSmtp ? { otpCode: verificationCode } : {})
        }
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(200).json({
      success: true,
      message: 'Google login successful.',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        contactNumber: user.contactNumber,
        city: user.city,
        companyName: user.companyName,
        address: user.address,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

export const googleSignup = async (req, res, next) => {
  try {
    const { profile } = req.body;

    if (!profile || !profile.email) {
      return res.status(400).json({
        success: false,
        message: 'Google profile payload is invalid.'
      });
    }

    const email = profile.email.toLowerCase();
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({
        success: false,
        message: 'Google email is already registered. Please check your credentials or try logging in instead.'
      });
    }

    const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 5);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    user = new User({
      fullName: profile.name || 'Google User',
      username,
      email,
      password: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      isVerified: false,
      role: 'Administrator',
      avatarUrl: profile.picture || '',
      verificationCode,
      verificationCodeExpires,
      status: 'active'
    });

    await user.save();
    
    // Dispatch OTP email
    await sendOtpEmail(user.email, user.fullName, verificationCode, 'verification');

    const hasSmtp = process.env.SMTP_USER && process.env.SMTP_PASS;

    return res.status(201).json({
      success: true,
      message: hasSmtp 
        ? 'Account registered successfully. Please verify using the code sent to your Google email.'
        : `[SIMULATION MODE] Account registered. OTP code is: ${verificationCode}`,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role
      },
      data: {
        ...(!hasSmtp ? { otpCode: verificationCode } : {})
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, username, contactNumber, city, companyName, address } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    // If changing username, check uniqueness
    if (username && username !== user.username) {
      const exist = await User.findOne({ username });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: 'Username is already in use.'
        });
      }
      user.username = username;
    }

    if (fullName) user.fullName = fullName;
    if (contactNumber !== undefined) user.contactNumber = contactNumber;
    if (city !== undefined) user.city = city;
    if (companyName !== undefined) user.companyName = companyName;
    if (address !== undefined) user.address = address;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile details saved successfully.',
      data: {
        id: user._id,
        userId: user.userId || user.user_id || '',
        user_id: user.user_id || user.userId || '',
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        contactNumber: user.contactNumber,
        city: user.city,
        companyName: user.companyName,
        address: user.address,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateAvatar = async (req, res, next) => {
  try {
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({
        success: false,
        message: 'Avatar image payload (base64 string) is required.'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    user.avatarUrl = avatar;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Avatar image updated successfully.',
      avatarUrl: user.avatarUrl
    });
  } catch (error) {
    next(error);
  }
};

export const removeAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    user.avatarUrl = '';
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile photo removed successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.'
      });
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Invalid session user.'
      });
    }

    const accessToken = generateAccessToken(user);

    return res.status(200).json({
      success: true,
      accessToken
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token is invalid or expired.'
    });
  }
};
