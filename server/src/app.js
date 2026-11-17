import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.js';
import resumeRoutes from './routes/resumes.js';
import analysisRoutes from './routes/analysis.js';
import aiRoutes from './routes/ai.js';
import { errorHandler, notFound } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The React build. When it exists, this one server hosts both the website and the API.
const CLIENT_DIST = process.env.CLIENT_DIST || path.resolve(__dirname, '../../client/dist');

export function createApp() {
  const app = express();
  const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean);
  const serveClient = fs.existsSync(path.join(CLIENT_DIST, 'index.html'));

  app.set('trust proxy', 1); // Render sits behind a proxy (needed for rate limiting by IP)
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
          'img-src': ["'self'", 'data:'],
          // Only force https when actually deployed; plain http://localhost must keep working
          'upgrade-insecure-requests': process.env.NODE_ENV === 'production' && !process.env.ALLOW_HTTP ? [] : null
        }
      }
    })
  );
  app.use(cors({ origin: origins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/resumes', resumeRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api', analysisRoutes);
  app.use('/api', notFound);

  if (serveClient) {
    // Hashed assets can be cached forever; index.html must always be fresh
    app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1y', immutable: true }));
    // Any other GET is a React Router page (/dashboard, /cv/:id …)
    // (/assets/* misses fall through to a 404 so a stale cached chunk fails loudly)
    app.get(/^(?!\/(?:api|assets)(?:\/|$)).*/, (req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
