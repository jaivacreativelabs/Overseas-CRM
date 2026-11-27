import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';
import { AutomationService } from './modules/integrations/automation.service';
import { MetaAdsService } from './modules/integrations/meta-ads.service';
import { seedDatabase } from './database/seeders/seed';

// Pull new Meta Instant Form leads every few minutes (backup for webhooks; the only path on localhost).
const startMetaLeadSync = () => {
  const minutes = Number(process.env.META_LEAD_SYNC_MINUTES || 5);
  if (!minutes || minutes <= 0) return;
  const run = () =>
    MetaAdsService.syncLeadsFromMeta()
      .then((r) => {
        if (r.created) logger.info(`Meta lead sync: ${r.created} new lead(s) from ${r.formsChecked} form(s)`);
        for (const e of r.errors) logger.warn(`Meta lead sync failed for form ${e.formId}: ${e.message}`);
      })
      .catch((err) => logger.warn('Meta lead sync error:', err?.message));
  run();
  setInterval(run, minutes * 60 * 1000);
};

const startServer = async () => {
  try {
    // 1. Initialize Express App
    const app = createApp();

    // 2. Start HTTP Server immediately
    const server = app.listen(env.PORT, '127.0.0.1', () => {
      logger.info(`🚀 Overseas Education CRM Backend & Frontend running on http://localhost:${env.PORT}`);
      logger.info(`📡 API Base URL: http://localhost:${env.PORT}/api/v1`);
    });

    // 3. Connect to Database & Seed asynchronously
    connectDatabase()
      .then(async () => {
        await seedDatabase();
        await AutomationService.initializeDefaultWorkflows();
        startMetaLeadSync();
      })
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
