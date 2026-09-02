import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Secure private storage directory (outside public static root)
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/payment_proofs');

// Ensure directory exists with secure permissions
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Storage configuration with random UUID filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.pdf'].includes(ext) ? ext : '.bin';
    const randomName = `${crypto.randomUUID()}${safeExt}`;
    cb(null, randomName);
  },
});

// MIME type filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only JPG, PNG, and PDF files are accepted.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Multer upload instance with 10MB limit
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter,
});

/**
 * Middleware wrapper for single payment proof upload with graceful error handling
 */
export const uploadPaymentProofMiddleware = (req, res, next) => {
  const singleUpload = upload.single('paymentProof');

  singleUpload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File is too large. Maximum allowed size is 10 MB.',
          errors: [{ field: 'paymentProof', message: 'File size exceeds 10 MB limit.' }]
        });
      }

      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          message: err.message,
          errors: [{ field: 'paymentProof', message: err.message }]
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || 'Error occurred while uploading payment proof.',
        errors: [{ field: 'paymentProof', message: err.message }]
      });
    }

    next();
  });
};

export { UPLOAD_DIR };
