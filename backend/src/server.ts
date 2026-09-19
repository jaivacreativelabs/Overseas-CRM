import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';
import { seedDatabase } from './database/seeders/seed';

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDatabase();

    // 2. Auto-seed if database is empty
    await seedDatabase();

    // 3. Initialize Express App
    const app = createApp();

    // 4. Start Server
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Overseas Education CRM Backend running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`📡 API Base URL: http://localhost:${env.PORT}/api/v1`);
    });

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
