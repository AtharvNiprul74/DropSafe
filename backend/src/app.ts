import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { globalRateLimiter } from './middlewares/rateLimiter';
import { errorHandler } from './middlewares/errorHandler';
import { sendSuccess } from './core/utils/response';
import { NotFoundError } from './core/errors/AppError';
import { prisma } from './config/database';

// Routers
import authRoutes from './modules/auth/auth.routes';
import organizationRoutes from './modules/organization/organization.routes';
import governanceRoutes from './modules/governance/governance.routes';
import academicRoutes from './modules/academic/academic.routes';
import studentRoutes from './modules/student/student.routes';
import importRoutes from './modules/import/routes/import.routes';
import behaviourRoutes from './modules/behaviour/routes/behaviour.routes';
import aiRoutes from './modules/ai/routes/ai.routes';
import counselingRoutes from './modules/counseling/routes/counseling.routes';

export function createApp(): Application {
  const app = express();

  // Security & Utility Middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Global Rate Limiting
  app.use(globalRateLimiter);

  // Health Check Endpoints
  app.get('/health', (_req: Request, res: Response) => {
    sendSuccess(res, { status: 'healthy', timestamp: new Date().toISOString() }, 'DropSafe Core Platform is healthy');
  });

  app.get('/api/v1/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Deep health check checking database
      await prisma.$queryRaw`SELECT 1`;
      sendSuccess(
        res,
        {
          status: 'healthy',
          database: 'connected',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
        'DropSafe V1 Platform & Database operational'
      );
    } catch (error) {
      next(error);
    }
  });

  // API V1 Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/organization', organizationRoutes);
  app.use('/api/v1/governance', governanceRoutes);
  app.use('/api/v1/academic', academicRoutes);
  app.use('/api/v1/students', studentRoutes);
  app.use('/api/v1/student', studentRoutes);
  app.use('/api/v1/import', importRoutes);
  app.use('/api/v1/behaviour', behaviourRoutes);
  app.use('/api/v1/ai', aiRoutes);
  app.use('/api/v1/counseling', counselingRoutes);

  // 404 Handler for undefined routes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
}
