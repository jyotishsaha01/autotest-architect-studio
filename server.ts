import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { aiRouter } from './server/aiRouter.js';
import { webhookRouter } from './server/webhookRouter.js';
import { requireApiToken } from './server/apiAuth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.APP_API_TOKEN || process.env.APP_API_TOKEN.length < 32) {
      throw new Error('Set APP_API_TOKEN to a random value of at least 32 characters before starting in production.');
    }
    if (!process.env.WEBHOOK_ENCRYPTION_KEY || !/^[a-f0-9]{64}$/i.test(process.env.WEBHOOK_ENCRYPTION_KEY)) {
      throw new Error('Set WEBHOOK_ENCRYPTION_KEY to a securely generated 64-character hexadecimal key before starting in production.');
    }
  }
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      authenticationRequired: !!process.env.APP_API_TOKEN,
      webhookEncryptionConfigured: true,
      webhookAuthMode: process.env.APP_API_TOKEN ? 'bearer-token' : 'development-open',
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api', requireApiToken);
  app.get('/api/session', (_req, res) => res.json({ success: true }));

  // API Routes
  app.use('/api', aiRouter);
  app.use('/api', webhookRouter);

  // Keep unknown API URLs from falling through to the SPA HTML response.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoTest Architect server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
