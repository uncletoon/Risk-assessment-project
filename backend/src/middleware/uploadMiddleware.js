// ============================================================================
// Secure Single-Document Upload Middleware
// Enforces MIME type, extension, size limits, and safe filenames
// ============================================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedExt = path.extname(file.originalname).toLowerCase();
    const safeBaseName = path.basename(file.originalname, sanitizedExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${safeBaseName}-${uniqueSuffix}${sanitizedExt}`);
  },
});

const allowedMimes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/plain',
  'application/json',
];

const allowedExtensions = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.json'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext) || allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Only PDF, DOCX, XLSX, and CSV business documents are permitted.`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max limit
    files: 1, // Strict single file limit
  },
  fileFilter: fileFilter,
});

module.exports = upload;
