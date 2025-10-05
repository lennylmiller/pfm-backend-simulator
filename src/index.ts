import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { requestLogger } from './middleware/logging';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { prisma } from './config/database';
import { logger } from './config/logger';
import routes from './routes';
import migrateRoutes from './routes/migrate';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - MUST be first to handle preflight requests
if (process.env.ENABLE_CORS === 'true') {
  const origins = process.env.CORS_ORIGINS?.split(',') || ['*'];
  app.use(
    cors({
      origin: origins,
      credentials: true,
    })
  );
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Disable ETags and caching to prevent 304 responses during development
app.set('etag', false);

// Add cache-control headers and remove ETag from responses
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  // Override res.send to remove ETag header
  const originalSend = res.send;
  res.send = function (data) {
    res.removeHeader('ETag');
    res.removeHeader('etag');
    return originalSend.call(this, data);
  };

  next();
});

// Request logging
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v2', routes);

// Migration tool routes
app.use('/api/migrate', migrateRoutes);

// Static files for migration UI
app.use('/migrate-ui', express.static(path.join(__dirname, '../tools/migrate-ui')));

// Redirect /migrate to /migrate-ui for convenience
app.get('/migrate', (req, res) => {
  res.redirect('/migrate-ui');
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server (only in non-test environments)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`PFM Backend Simulator listening on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
  });
}

export { app };
