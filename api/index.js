import app from '../server/index.js';

export default async function handler(req, res) {
  try {
    return app(req, res);
  } catch (err) {
    console.error('❌ [VERCEL SERVERLESS TOP-LEVEL ERROR]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        error: 'Erreur serveur'
      });
    }
  }
}
