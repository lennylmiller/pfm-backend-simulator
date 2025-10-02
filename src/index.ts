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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
if (process.env.ENABLE_CORS === 'true') {
  const origins = process.env.CORS_ORIGINS?.split(',') || ['*'];
  app.use(
    cors({
      origin: origins,
      credentials: true,
    })
  );
}

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

// Start server
app.listen(PORT, () => {
  logger.info(`PFM Backend Simulator listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

export { app };
