import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import mailRoutes from './routes/mail.routes.js';
import auditRoutes from './routes/audit.routes.js';
import statsRoutes from './routes/stats.routes.js';
import backupRoutes from './routes/backup.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import serviceRoutes from './routes/service.routes.js';

import { initBackupScheduler } from './services/backup.service.js';
import { seedDatabase } from './db/seed.js';

const app = express();
const PORT = process.env.PORT || 5000;


app.use(helmet({
  contentSecurityPolicy: false, 
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: false // Allow PDF viewer iframe & embed previews
}));

// Dynamic CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
].filter(Boolean);

if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(orig => {
    const trimmed = orig.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server) or development mode
    if (!origin || process.env.NODE_ENV !== 'production' || process.env.VERCEL) {
      return callback(null, true);
    }

    // Automatically allow any Vercel domain (*.vercel.app)
    if (origin && origin.includes('vercel.app')) {
      return callback(null, true);
    }

    // Check if origin matches allowed list or wildcard
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === '*' || allowed === origin) return true;
      try {
        const originUrl = new URL(origin);
        const allowedUrl = new URL(allowed);
        return originUrl.origin === allowedUrl.origin;
      } catch (e) {
        return false;
      }
    });

    if (isAllowed || allowedOrigins.length === 0) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Origine non listée dans CORS: ${origin}, autorisation accordée.`);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Pre-flight handling
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.' }
});

app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mails', mailRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/services', serviceRoutes);

// Serve static PDF uploads safely
const uploadPdfsDir = process.env.VERCEL
  ? path.join('/tmp', 'uploads', 'pdfs')
  : path.resolve(__dirname, 'uploads/pdfs');
const uploadsBaseDir = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.resolve(__dirname, 'uploads');

if (!process.env.VERCEL) {
  try {
    if (!fs.existsSync(uploadPdfsDir)) {
      fs.mkdirSync(uploadPdfsDir, { recursive: true });
    }
  } catch (e) {
    console.warn("Skipping local directory creation:", e.message);
  }
}
try {
  app.use('/uploads/pdfs', express.static(uploadPdfsDir));
  app.use('/uploads', express.static(uploadsBaseDir));
} catch (e) {
  // Ignored
}

// Serve production frontend assets if built
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(distDir, 'index.html'));
    }
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    db_engine: 'PostgreSQL (Neon Tech)',
    database: process.env.DB_NAME || process.env.PGDATABASE || 'dtf_benslimane',
    entity: 'Division Technique et Financière - Commune de Benslimane',
    timestamp: new Date().toISOString()
  });
});

// Global Express Error Handler Middleware (Prevents ERR_CONNECTION_RESET & returns explicit JSON)
app.use((err, req, res, next) => {
  console.error('❌ Erreur Middleware Global Express:', err);
  
  if (req.file && fs.existsSync(req.file.path)) {
    try { fs.unlinkSync(req.file.path); } catch (e) {}
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Erreur interne du serveur.';

  if (!res.headersSent) {
    res.status(statusCode).json({
      success: false,
      message: 'Erreur serveur',
      error: message
    });
  }
});

// Process Exception Safety Handlers (Server never crashes)
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception capturée:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection capturée:', reason);
});

// Start background cron scheduler & HTTP server (Standalone mode only)
async function startServer() {
  try {
    await seedDatabase();
  } catch (seedErr) {
    console.error('❌ Erreur lors de l exécution de seedDatabase au démarrage:', seedErr);
  }

  const server = app.listen(PORT, async () => {
    const serverDisplayUrl = process.env.SERVER_URL || `http://localhost:${PORT}`;
    console.log(`🚀 Serveur Backend DTF opérationnel sur ${serverDisplayUrl} (Port: ${PORT}, Mode: ${process.env.NODE_ENV || 'development'})`);
    
    try {
      initBackupScheduler();
    } catch (err) {
      console.error('❌ Erreur lors de l initialisation du planificateur de sauvegardes:', err);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ [PORT CONFLICT] Le port ${PORT} est déjà utilisé par un autre processus.`);
      console.error(`💡 Conseil : Définissez un port alternatif (ex: PORT=5001) dans .env ou libérez le port ${PORT}.\n`);
      process.exit(1);
    } else {
      console.error('❌ Erreur serveur HTTP:', err);
    }
  });

  // Graceful Shutdown on SIGINT and SIGTERM to instantly release port 5000
  const gracefulShutdown = (signal) => {
    console.log(`\n🛑 Signal ${signal} reçu. Fermeture du serveur et libération du port ${PORT}...`);
    server.close(() => {
      console.log('✅ Serveur arrêté et port libéré proprement.');
      process.exit(0);
    });

    setTimeout(() => {
      console.warn('⚠️ Fermeture forcée après délai d attente.');
      process.exit(0);
    }, 2000).unref();
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

// Only launch HTTP listener if not running in Vercel Serverless environment
if (!process.env.VERCEL) {
  startServer();
}

export default app;
