import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';
import { seedDatabase } from './database/seeders/seed';

const startServer = async () => {
  try {
    // 1. Initialize Express App
    const app = createApp();

    // 2. Start HTTP Server immediately
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Overseas Education CRM Backend & Frontend running on http://localhost:${env.PORT}`);
      logger.info(`📡 API Base URL: http://localhost:${env.PORT}/api/v1`);
    });

    // 3. Connect to Database & Seed asynchronously
    connectDatabase()
      .then(() => seedDatabase())
      .catch((err) => logger.error('Database connection error:', err));

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error: any) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
