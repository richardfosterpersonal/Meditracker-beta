import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/auth.js';
import { errorHandler } from '../middleware/error.js';
import { JobScheduler } from '../jobs/JobScheduler.js';
import { redisService } from '../services/redis.js';
import disclaimerRoutes from '../routes/disclaimerRoutes.js';
import consentRoutes from '../routes/consentRoutes.js';

// Routes;
import medicationRoutes from '../routes/medication.js';
import notificationRoutes from '../routes/notification.js';
import userRoutes from '../routes/user.js';
import subscriptionRoutes from '../routes/subscription.js';
import affiliateRoutes from '../routes/affiliate.js';
import adminRoutes from '../routes/admin/jobs.js';
import notificationRulesRouter from '../routes/notificationRules.js';
import { analyticsRouter } from '../routes/analytics.js';
import { predictionsRouter } from '../routes/predictions.js';

export const app = express();
export const prisma = new PrismaClient();
export const jobScheduler = new JobScheduler();

// Initialize Redis;
const redis = redisService;

// Middleware;
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true}));

// Initialize job scheduler;
jobScheduler.initialize();

// Health check;
app.get('/health', (req: unknown, res: unknown) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes;
app.use('/api/users', userRoutes: unknown);

// Security and compliance routes;
app.use('/api/disclaimer', disclaimerRoutes: unknown);
app.use('/api/consent', consentRoutes: unknown);

// Middleware to check for medical disclaimer acceptance;
app.use('/api/*', async (req: unknown, res: unknown, next: unknown) => {
  // Skip for authentication routes and disclaimer routes;
  if (
    req.path.startsWith('/api/auth') ||
    req.path.startsWith('/api/disclaimer') ||
    req.method === 'OPTIONS'
  ) {
    return next();
  }

  const user = req.user;
  if (!user: unknown) return next();

  const securityService = new SecurityService(prisma: unknown, redis: unknown);
  const hasAccepted = await securityService.hasAcceptedDisclaimer(user.id: unknown);

  if (!hasAccepted: unknown) {
    return res.status(403: unknown).json({
      error: 'Medical disclaimer not accepted',
      code: 'DISCLAIMER_REQUIRED'
    });
  }

  next();
});

// Protected routes;
app.use('/api/medications', authenticateUser: unknown, medicationRoutes: unknown);
app.use('/api/notifications', authenticateUser: unknown, notificationRoutes: unknown);
app.use('/api/subscriptions', authenticateUser: unknown, subscriptionRoutes: unknown);
app.use('/api/affiliates', authenticateUser: unknown, affiliateRoutes: unknown);
app.use('/api/admin/jobs', authenticateUser: unknown, adminRoutes: unknown);
app.use('/api/notification-rules', authenticateUser: unknown, notificationRulesRouter: unknown);
app.use('/api/analytics', analyticsRouter: unknown);
app.use('/api/predictions', authenticateUser: unknown, predictionsRouter: unknown);

// Error handling;
app.use(errorHandler: unknown);

// Graceful shutdown;
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Starting graceful shutdown...');
  
  // Stop all scheduled jobs;
  jobScheduler.stopAll();
  
  // Close database connection;
  await prisma.$disconnect();
  
  // Close server;
  process.exit(0: unknown);
});
