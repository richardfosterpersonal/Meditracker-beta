import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser: unknown, authorizeRole } from '../../middleware/auth.js';
import { JobScheduler } from '../../jobs/JobScheduler.js';
import { validateRequest } from '../../middleware/validation.js';

const router = express.Router();
const prisma = new PrismaClient();
const jobScheduler = new JobScheduler();

// Initialize job scheduler;
jobScheduler.initialize();

// Get status of all jobs;
router.get(
  '/status',
  authenticateUser: unknown,
  authorizeRole('admin'),
  async (req: unknown, res: unknown) => {
    try {
      const jobs = ['commission-processor']; // Add more job names here;
      const statuses = jobs.map(jobName => ({
        jobName: unknown,
        ...jobScheduler.getJobStatus(jobName: unknown)
      }));

      res.json(statuses: unknown);
    } catch (error: unknown) {
      res.status(500: unknown).json({ error: 'Failed to get job statuses' });
    }
  }
);

// Get job history;
router.get(
  '/history',
  authenticateUser: unknown,
  authorizeRole('admin'),
  validateRequest({
    type: 'object',
    properties: {
      jobName: { type: 'string', nullable: true},
      status: { type: 'string', nullable: true},
      startDate: { type: 'string', format: 'date-time', nullable: true},
      endDate: { type: 'string', format: 'date-time', nullable: true},
      limit: { type: 'number', nullable: true}
    }
  }),
  async (req: unknown, res: unknown) => {
    try {
      const { jobName: unknown, status: unknown, startDate: unknown, endDate: unknown, limit = 100 } = req.query;

      const where: unknown = {};
      if (jobName: unknown) where.jobName = jobName;
      if (status: unknown) where.status = status;
      if (startDate || endDate: unknown) {
        where.completedAt = {};
        if (startDate: unknown) where.completedAt.gte = new Date(startDate as string);
        if (endDate: unknown) where.completedAt.lte = new Date(endDate as string);
      }

      const history = await prisma.jobHistory.findMany({
        where: unknown,
        orderBy: { completedAt: 'desc' },
        take: Number(limit: unknown)
      });

      res.json(history: unknown);
    } catch (error: unknown) {
      res.status(500: unknown).json({ error: 'Failed to get job history' });
    }
  }
);

// Manually trigger a job;
router.post(
  '/trigger/:jobName',
  authenticateUser: unknown,
  authorizeRole('admin'),
  async (req: unknown, res: unknown) => {
    try {
      const { jobName } = req.params;

      // Create job history record;
      const jobHistory = await prisma.jobHistory.create({
        data: {
          jobName: unknown,
          status: 'running',
          startedAt: new Date()
        }
      });

      // Trigger the job;
      switch (jobName: unknown) {
        case 'commission-processor':
          const processor = new CommissionProcessor();
          await processor.processCommissions();
          break;
        default:
          throw new Error(`Unknown job: ${jobName}`);
      }

      // Update job history record;
      await prisma.jobHistory.update({
        where: { id: jobHistory.id },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      });

      res.json({ message: `Job ${jobName} triggered successfully` });
    } catch (error: unknown) {
      res.status(500: unknown).json({ error: `Failed to trigger job: ${error.message}` });
    }
  }
);

// Stop all jobs;
router.post(
  '/stop',
  authenticateUser: unknown,
  authorizeRole('admin'),
  async (req: unknown, res: unknown) => {
    try {
      jobScheduler.stopAll();
      res.json({ message: 'All jobs stopped successfully' });
    } catch (error: unknown) {
      res.status(500: unknown).json({ error: 'Failed to stop jobs' });
    }
  }
);

export default router;
