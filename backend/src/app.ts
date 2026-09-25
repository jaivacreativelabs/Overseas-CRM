import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';

import { errorHandler } from './middleware/error.middleware';
import { uploadDir } from './middleware/upload.middleware';
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
  app.use(helmet({ crossOriginResourcePolicy: false, hidePoweredBy: false }));
  const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(morgan('dev'));

  // Static uploads directory
  try {
    app.use('/uploads', express.static(uploadDir));
  } catch {
    // Graceful fallback for serverless
  }

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

  // Mount API v1 Feature Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/leads', leadRoutes);
  app.use('/api/v1/profile-evaluations', profileRoutes);
  app.use('/api/v1/universities', universityRoutes);
  app.use('/api/v1/documents', documentRoutes);
  app.use('/api/v1/applications', applicationRoutes);
  app.use('/api/v1/offers', offerRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/visa', visaRoutes);
  app.use('/api/v1/travel', travelRoutes);
  app.use('/api/v1/orientation', orientationRoutes);
  app.use('/api/v1/tasks', taskRoutes);
  app.use('/api/v1/messages', messageRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/masters', masterRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/audit-logs', auditRoutes);
  app.use('/api/v1/activities', activityRoutes);

  // 404 Route handler
  app.use((req: Request, res: Response) => {
    return ApiResponse.error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
  });

  // Global centralized error handler
  app.use(errorHandler);

  return app;
};
