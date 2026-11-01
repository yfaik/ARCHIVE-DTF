import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '../uploads/pdfs');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  fs.accessSync(uploadDir, fs.constants.R_OK | fs.constants.W_OK);
} catch (err) {
  console.error('Erreur d accès au dossier uploads/pdfs:', err);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
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
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    return buffer.toString('utf8').startsWith('%PDF');
  } catch (e) {
    return false;
  }
}
