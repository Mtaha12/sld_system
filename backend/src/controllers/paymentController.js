import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import PaymentSubmission from '../models/PaymentSubmission.js';
import ApprovalToken from '../models/ApprovalToken.js';
import PaymentConfig from '../models/PaymentConfig.js';
import { 
  sendOwnerPaymentVerificationEmail, 
  sendUserAccountApprovedEmail, 
  sendUserPaymentRejectedEmail 
} from '../../services/emailService.js';
import logger from '../utils/logger.js';

/**
 * Helper to format bytes into readable size string
 */
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get dynamic payment instructions and bank accounts
 */
export const getPaymentInstructions = async (req, res, next) => {
  try {
    const config = await PaymentConfig.getActiveConfig();
    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment and verification status for a specific user
 */
export const getPaymentStatus = async (req, res, next) => {
  try {
    const identifier = req.query.email || req.query.identifier || (req.user && req.user.email);

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Email address or user identifier is required.'
      });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { username: identifier.trim() }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    // Find latest payment submission
    const latestSubmission = await PaymentSubmission.findOne({
      userId: user._id
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        user_id: user.userId || user.user_id || user._id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
        isVerified: user.isVerified,
        latestSubmission: latestSubmission ? {
          id: latestSubmission._id,
          status: latestSubmission.status,
          rejectionReason: latestSubmission.rejectionReason || latestSubmission.rejection_reason || null,
          fileName: latestSubmission.fileName || latestSubmission.file_name,
          fileSize: latestSubmission.fileSize || latestSubmission.file_size,
          submittedAt: latestSubmission.createdAt,
          reviewedAt: latestSubmission.reviewedAt || latestSubmission.reviewed_at
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload payment proof receipt (JPEG, PNG, PDF up to 10MB)
 */
export const uploadPaymentProof = async (req, res, next) => {
  try {
    const { email, identifier } = req.body;
    const targetEmail = (email || identifier || (req.user && req.user.email) || '').trim();

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Payment proof file is required (JPG, PNG, or PDF).',
        errors: [{ field: 'paymentProof', message: 'Please select a payment receipt file.' }]
      });
    }

    if (!targetEmail) {
      // Clean up uploaded file if email validation fails
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'User email is required.',
        errors: [{ field: 'email', message: 'User email address is required for submission.' }]
      });
    }

    const user = await User.findOne({
      $or: [
        { email: targetEmail.toLowerCase() },
        { username: targetEmail }
      ]
    });

    if (!user) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'User account not found. Please register first.'
      });
    }

    if (!user.isVerified) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        message: 'Your email address is not verified yet. Please verify OTP first.',
        unverified: true
      });
    }

    if (user.status === 'ACTIVE' || user.status === 'active') {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Your account is already active and approved. You may proceed to login.'
      });
    }

    // Create PaymentSubmission record
    const submission = new PaymentSubmission({
      userId: user._id,
      user_id: user._id,
      filePath: req.file.path,
      file_path: req.file.path,
      fileName: req.file.originalname,
      file_name: req.file.originalname,
      mimeType: req.file.mimetype,
      mime_type: req.file.mimetype,
      fileSize: req.file.size,
      file_size: req.file.size,
      status: 'PENDING_REVIEW'
    });
    await submission.save();

    // If user was previously REJECTED, reset status to PENDING_APPROVAL
    if (user.status === 'REJECTED') {
      user.status = 'PENDING_APPROVAL';
      await user.save();
    }

    // Generate single-use cryptographic tokens (valid for 7 days)
    const tokenApprove = crypto.randomBytes(32).toString('hex');
    const tokenReject = crypto.randomBytes(32).toString('hex');
    const tokenProof = crypto.randomBytes(32).toString('hex');

    const expiresHours = parseInt(process.env.APPROVAL_TOKEN_EXPIRES_HOURS || '168', 10); // 7 days default
    const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000);

    await ApprovalToken.create([
      {
        paymentSubmissionId: submission._id,
        payment_submission_id: submission._id,
        userId: user._id,
        user_id: user._id,
        token: tokenApprove,
        actionType: 'APPROVE',
        action_type: 'APPROVE',
        expiresAt,
        expires_at: expiresAt
      },
      {
        paymentSubmissionId: submission._id,
        payment_submission_id: submission._id,
        userId: user._id,
        user_id: user._id,
        token: tokenReject,
        actionType: 'REJECT',
        action_type: 'REJECT',
        expiresAt,
        expires_at: expiresAt
      },
      {
        paymentSubmissionId: submission._id,
        payment_submission_id: submission._id,
        userId: user._id,
        user_id: user._id,
        token: tokenProof,
        actionType: 'VIEW_PROOF',
        action_type: 'VIEW_PROOF',
        expiresAt,
        expires_at: expiresAt
      }
    ]);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const serverUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;

    const approveUrl = `${clientUrl}/payment-review/approve/${tokenApprove}`;
    const rejectUrl = `${clientUrl}/payment-review/reject/${tokenReject}`;
    const proofUrl = `${serverUrl}/api/payment/proof/${tokenProof}`;

    // Dispatch email to owner
    await sendOwnerPaymentVerificationEmail({
      userName: user.fullName,
      userEmail: user.email,
      registrationDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) : new Date().toLocaleDateString('en-US', { dateStyle: 'medium' }),
      uploadTimestamp: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      proofUrl,
      approveUrl,
      rejectUrl,
      fileName: req.file.originalname,
      fileSizeFormatted: formatFileSize(req.file.size)
    });

    logger.info(`[Payment Upload Success] Proof submitted for ${user.email} (Submission: ${submission._id})`);

    return res.status(201).json({
      success: true,
      message: 'Payment proof uploaded successfully and submitted for administrator verification.',
      data: {
        submissionId: submission._id,
        fileName: submission.fileName,
        fileSize: submission.fileSize,
        status: submission.status,
        submittedAt: submission.createdAt
      }
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    next(error);
  }
};

/**
 * Securely stream payment proof file to browser inline
 */
export const viewPaymentProof = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).send('Invalid proof access token.');
    }

    // Look up token
    const tokenDoc = await ApprovalToken.findOne({
      token,
      expiresAt: { $gt: new Date() }
    });

    if (!tokenDoc) {
      return res.status(403).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #0B0C10; color: #fff; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <h2 style="color: #EF4444;">Access Token Expired or Invalid</h2>
          <p>The link to view this payment proof has expired or is invalid.</p>
        </div>
      `);
    }

    const submission = await PaymentSubmission.findById(tokenDoc.paymentSubmissionId);
    if (!submission || !submission.filePath) {
      return res.status(404).send('Payment proof record or file not found.');
    }

    const safeFilePath = path.resolve(submission.filePath);
    if (!fs.existsSync(safeFilePath)) {
      return res.status(404).send('Payment proof file not found on disk.');
    }

    res.setHeader('Content-Type', submission.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(submission.fileName || 'payment_proof')}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const stream = fs.createReadStream(safeFilePath);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Returns review metadata for a single-use review token
 */
export const getReviewTokenData = async (req, res, next) => {
  try {
    const { token } = req.params;

    const tokenDoc = await ApprovalToken.findOne({ token });
    if (!tokenDoc) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or non-existent approval token.'
      });
    }

    if (tokenDoc.usedAt) {
      return res.status(410).json({
        success: false,
        message: 'This approval token has already been used.',
        used: true,
        usedAt: tokenDoc.usedAt
      });
    }

    if (tokenDoc.expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        message: 'This approval token has expired.',
        expired: true,
        expiresAt: tokenDoc.expiresAt
      });
    }

    const submission = await PaymentSubmission.findById(tokenDoc.paymentSubmissionId);
    const user = await User.findById(tokenDoc.userId || (submission && submission.userId)).select('-password');

    const serverUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
    const proofUrl = `${serverUrl}/api/payment/proof/${tokenDoc.token}`;

    return res.status(200).json({
      success: true,
      data: {
        actionType: tokenDoc.actionType,
        token: tokenDoc.token,
        expiresAt: tokenDoc.expiresAt,
        submission: submission ? {
          id: submission._id,
          status: submission.status,
          fileName: submission.fileName,
          fileSize: submission.fileSize,
          mimeType: submission.mimeType,
          submittedAt: submission.createdAt,
          proofUrl
        } : null,
        user: user ? {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          companyName: user.companyName,
          contactNumber: user.contactNumber,
          city: user.city,
          registeredAt: user.createdAt
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve payment submission and activate user account
 */
export const approveSubmission = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Approval token is required.'
      });
    }

    const tokenDoc = await ApprovalToken.findOne({ token, actionType: 'APPROVE' });
    if (!tokenDoc) {
      return res.status(404).json({
        success: false,
        message: 'Invalid approval link. Token not found.'
      });
    }

    if (tokenDoc.usedAt) {
      return res.status(400).json({
        success: false,
        message: 'This approval link has already been used.',
        used: true
      });
    }

    if (tokenDoc.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This approval link has expired.',
        expired: true
      });
    }

    // Fetch submission and user
    const submission = await PaymentSubmission.findById(tokenDoc.paymentSubmissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Payment submission not found.'
      });
    }

    const user = await User.findById(submission.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User associated with payment submission not found.'
      });
    }

    // Mark token as used
    tokenDoc.usedAt = new Date();
    tokenDoc.used_at = tokenDoc.usedAt;
    await tokenDoc.save();

    // Update payment submission
    submission.status = 'APPROVED';
    submission.reviewedAt = new Date();
    submission.reviewed_at = submission.reviewedAt;
    await submission.save();

    // Update user status
    user.status = 'ACTIVE';
    await user.save();

    // Send activation email to user
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const loginUrl = `${clientUrl}/login`;
    await sendUserAccountApprovedEmail({
      fullName: user.fullName,
      email: user.email,
      loginUrl
    });

    logger.info(`[Payment Approved] User ${user.email} activated by owner email action.`);

    return res.status(200).json({
      success: true,
      message: 'Account has been approved successfully. The user is now active and has been notified via email.',
      data: {
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject payment submission with reason
 */
export const rejectSubmission = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { reason, rejectionReason } = req.body;
    const reasonText = (reason || rejectionReason || '').trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Rejection token is required.'
      });
    }

    if (!reasonText || reasonText.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required (minimum 3 characters).',
        errors: [{ field: 'reason', message: 'Please provide a clear reason for rejecting this payment proof.' }]
      });
    }

    const tokenDoc = await ApprovalToken.findOne({ token, actionType: 'REJECT' });
    if (!tokenDoc) {
      return res.status(404).json({
        success: false,
        message: 'Invalid rejection link. Token not found.'
      });
    }

    if (tokenDoc.usedAt) {
      return res.status(400).json({
        success: false,
        message: 'This action link has already been used.',
        used: true
      });
    }

    if (tokenDoc.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This rejection link has expired.',
        expired: true
      });
    }

    // Fetch submission and user
    const submission = await PaymentSubmission.findById(tokenDoc.paymentSubmissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Payment submission not found.'
      });
    }

    const user = await User.findById(submission.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User associated with payment submission not found.'
      });
    }

    // Mark token as used
    tokenDoc.usedAt = new Date();
    tokenDoc.used_at = tokenDoc.usedAt;
    await tokenDoc.save();

    // Update payment submission
    submission.status = 'REJECTED';
    submission.rejectionReason = reasonText;
    submission.rejection_reason = reasonText;
    submission.reviewedAt = new Date();
    submission.reviewed_at = submission.reviewedAt;
    await submission.save();

    // Update user status
    user.status = 'REJECTED';
    await user.save();

    // Send rejection email to user
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const paymentInstructionsUrl = `${clientUrl}/payment-instructions`;
    await sendUserPaymentRejectedEmail({
      fullName: user.fullName,
      email: user.email,
      rejectionReason: reasonText,
      paymentInstructionsUrl
    });

    logger.info(`[Payment Rejected] User ${user.email} rejected by owner. Reason: ${reasonText}`);

    return res.status(200).json({
      success: true,
      message: 'Payment verification has been rejected. The user has been notified with the reason.',
      data: {
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
        rejectionReason: reasonText
      }
    });
  } catch (error) {
    next(error);
  }
};
