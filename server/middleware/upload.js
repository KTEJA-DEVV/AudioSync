const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { AppError, ErrorCodes } = require('./errorHandler');

// Ensure uploads directory exists for local storage
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// S3 Client configuration
let s3Client = null;
if (config.aws.s3Bucket && config.aws.accessKey && config.aws.secretKey) {
  s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKey,
      secretAccessKey: config.aws.secretKey,
    },
  });
}

// Allowed audio MIME types
const audioMimeTypes = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/m4a',
  'audio/x-m4a',
  'audio/webm',
];

// File filter for audio files
const audioFileFilter = (req, file, cb) => {
  if (audioMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Invalid file type. Only audio files (MP3, WAV, OGG, FLAC, AAC, M4A, WebM) are allowed.',
        400,
        ErrorCodes.INVALID_FILE_TYPE
      ),
      false
    );
  }
};

// Generate unique filename
const generateFilename = (req, file) => {
  const uniqueSuffix = uuidv4();
  const ext = path.extname(file.originalname).toLowerCase();
  const userId = req.userId || 'anonymous';
  return `audio/${userId}/${uniqueSuffix}${ext}`;
};

// S3 storage configuration
const createS3Storage = () => {
  if (!s3Client) return null;
  
  return multerS3({
    s3: s3Client,
    bucket: config.aws.s3Bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        uploadedBy: req.userId || 'anonymous',
        uploadedAt: new Date().toISOString(),
      });
    },
    key: (req, file, cb) => {
      cb(null, generateFilename(req, file));
    },
  });
};

// Local storage configuration (fallback)
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(uploadsDir, req.userId || 'anonymous');
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// Choose storage based on configuration
const storage = s3Client ? createS3Storage() : localStorage;

if (!s3Client) {
  console.log('Using local storage for file uploads (S3 not configured)');
}

// Multer configuration for single audio upload
const audioUpload = multer({
  storage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1,
  },
});

// Multer configuration for multiple audio files
const multipleAudioUpload = multer({
  storage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 10, // Max 10 files
  },
});

// Error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new AppError('File too large. Maximum size is 50MB.', 400, ErrorCodes.FILE_TOO_LARGE)
      );
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(
        new AppError('Too many files. Maximum is 10 files.', 400, ErrorCodes.INVALID_INPUT)
      );
    }
    return next(new AppError(err.message, 400, ErrorCodes.UPLOAD_FAILED));
  }
  next(err);
};

// Upload single audio file middleware
const uploadAudio = (fieldName = 'audio') => [
  audioUpload.single(fieldName),
  handleMulterError,
];

// Upload multiple audio files middleware
const uploadMultipleAudio = (fieldName = 'audio', maxCount = 10) => [
  multipleAudioUpload.array(fieldName, maxCount),
  handleMulterError,
];

// Get file URL helper
const getFileUrl = (file, req) => {
  if (s3Client && file.location) {
    return file.location;
  }
  // Local file URL
  const relativePath = file.path.replace(uploadsDir, '').replace(/\\/g, '/');
  return `${req.protocol}://${req.get('host')}/uploads${relativePath}`;
};

module.exports = {
  audioUpload,
  multipleAudioUpload,
  uploadAudio,
  uploadMultipleAudio,
  handleMulterError,
  getFileUrl,
};
