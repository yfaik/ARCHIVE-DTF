import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In Vercel serverless environments (/var/task is read-only), use /tmp/uploads/pdfs
export const uploadDir = process.env.VERCEL
  ? path.join('/tmp', 'uploads', 'pdfs')
  : path.resolve(__dirname, '../uploads/pdfs');

// Safe directory creator that NEVER crashes the process
export function ensureUploadDir() {
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    return true;
  } catch (err) {
    console.warn(`ℹ️ [UPLOAD DIR NOTICE] Répertoire d upload non modifiable (${uploadDir}):`, err.message);
    return false;
  }
}

// Attempt to create directory safely at startup, ignoring read-only errors on serverless
ensureUploadDir();

// Choose disk storage targeting safe directory, or fallback gracefully
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    ensureUploadDir();
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    cb(null, `DTF_PDF_${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers PDF originaux (.pdf) sont autorisés.'), false);
  }
};

export const uploadPdf = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10)) * 1024 * 1024 // 25MB Max
  }
});

export function validatePdfMagicBytes(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return false;
    const buffer = Buffer.alloc(5);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);
    return buffer.toString('utf8').startsWith('%PDF-');
  } catch (e) {
    console.warn('⚠️ Erreur validation magic bytes PDF:', e.message);
    return false;
  }
}
