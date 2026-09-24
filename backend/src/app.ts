import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';

import { errorHandler } from './middleware/error.middleware';
import { ApiResponse } from './utils/api-response';

// Feature Route Modules
import { authRoutes } from './modules/auth';
import { userRoutes } from './modules/users';
import { leadRoutes } from './modules/leads';
import { profileRoutes } from './modules/profile-evaluation';
import { universityRoutes } from './modules/universities';
import { documentRoutes } from './modules/documents';
import { applicationRoutes } from './modules/applications';
import { offerRoutes } from './modules/offers';
import { paymentRoutes } from './modules/payments';
import { visaRoutes } from './modules/visa';
import { travelRoutes } from './modules/travel';
import { orientationRoutes } from './modules/orientation';
import { taskRoutes } from './modules/tasks';
import { messageRoutes } from './modules/messages';
import { notificationRoutes } from './modules/notifications';
import { masterRoutes } from './modules/masters';
import { reportRoutes } from './modules/reports';
import { auditRoutes } from './modules/audit-logs';
import { activityRoutes } from './modules/activities';

export const createApp = (): Express => {
  const app = express();

  // Security & standard middleware
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(morgan('dev'));

  // Static uploads directory
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    return ApiResponse.success(res, 'Overseas Education CRM API is operational', {
      timestamp: new Date().toISOString(),
      status: 'UP',
      uptime: process.uptime(),
    });
  });

  app.get('/api/v1/health', (req: Request, res: Response) => {
    return ApiResponse.success(res, 'Overseas Education CRM API is operational', {
      timestamp: new Date().toISOString(),
      status: 'UP',
      uptime: process.uptime(),
    });
  });

  // Mount API Feature Routes (supporting both /api/v1 and /v1 prefixes for Vercel Serverless)
  const mountRoutes = (prefix: string) => {
    app.use(`${prefix}/auth`, authRoutes);
    app.use(`${prefix}/users`, userRoutes);
    app.use(`${prefix}/leads`, leadRoutes);
    app.use(`${prefix}/profile-evaluations`, profileRoutes);
    app.use(`${prefix}/universities`, universityRoutes);
    app.use(`${prefix}/documents`, documentRoutes);
    app.use(`${prefix}/applications`, applicationRoutes);
    app.use(`${prefix}/offers`, offerRoutes);
    app.use(`${prefix}/payments`, paymentRoutes);
    app.use(`${prefix}/visa`, visaRoutes);
    app.use(`${prefix}/travel`, travelRoutes);
    app.use(`${prefix}/orientation`, orientationRoutes);
    app.use(`${prefix}/tasks`, taskRoutes);
    app.use(`${prefix}/messages`, messageRoutes);
    app.use(`${prefix}/notifications`, notificationRoutes);
    app.use(`${prefix}/masters`, masterRoutes);
    app.use(`${prefix}/reports`, reportRoutes);
    app.use(`${prefix}/audit-logs`, auditRoutes);
    app.use(`${prefix}/activities`, activityRoutes);
  };

  mountRoutes('/api/v1');
  mountRoutes('/v1');

  // 404 Route handler
  app.use((req: Request, res: Response) => {
    return ApiResponse.error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
  });

  // Global centralized error handler
  app.use(errorHandler);

  return app;
};
