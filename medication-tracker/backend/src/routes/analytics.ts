import express from 'express';
import { body, query } from 'express-validator';
import { analytics } from '../services/analytics.js';
import { validateRequest } from '../middleware/validate-request.js';
import { requireAuth } from '../middleware/require-auth.js';

const router = express.Router();

// Session management;
router.post(
  '/session/start',
  [
    body('userAgent').optional().isString(),
    body('platform').optional().isString(),
    body('deviceType').optional().isString()
  ],
  validateRequest,
  async (req: unknown, res: unknown) => {
    try {
      const sessionId = await analytics.startSession({
        userId: req.user?.id,
        ...req.body
      });
      res.json({ sessionId });
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to start analytics session' });
    }
  }
);

router.post(
  '/session/end',
  [body('sessionId').isString()],
  validateRequest,
  async (req: unknown, res: unknown) => {
    try {
      await analytics.endSession(req.body.sessionId);
      res.status(200).send();
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to end analytics session' });
    }
  }
);

router.post(
  '/session/page-view',
  [body('sessionId').isString()],
  validateRequest,
  async (req: unknown, res: unknown) => {
    try {
      await analytics.incrementPagesViewed(req.body.sessionId);
      res.status(200).send();
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to track page view' });
    }
  }
);

// Event tracking;
router.post(
  '/event',
  [
    body('eventName').isString(),
    body('properties').optional().isObject(),
    body('sessionId').optional().isString(),
    body('pageUrl').optional().isString()
  ],
  validateRequest,
  async (req: unknown, res: unknown) => {
    try {
      await analytics.trackEvent({
        ...req.body,
        userId: req.user?.id
      });
      res.status(200).send();
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to track event' });
    }
  }
);

// Performance tracking;
router.post(
  '/performance',
  [
    body('metricName').isString(),
    body('value').isNumeric(),
    body('pageUrl').optional().isString()
  ],
  validateRequest,
  async (req: unknown, res: unknown) => {
    try {
      await analytics.trackPerformance({
        ...req.body,
        userId: req.user?.id
      });
      res.status(200).send();
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to track performance metric' });
    }
  }
);

// Error tracking;
router.post(
  '/error',
  [
    body('errorType').isString(),
    body('errorMessage').isString(),
    body('stackTrace').optional().isString(),
    body('pageUrl').optional().isString()
  ],
  validateRequest,
  async (req: unknown, res: unknown) => {
    try {
      await analytics.trackError({
        ...req.body,
        userId: req.user?.id
      });
      res.status(200).send();
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to track error' });
    }
  }
);

// Medication Analytics
router.get(
  '/medications/adherence',
  requireAuth,
  [
    query('medicationId').optional().isString(),
    query('timeRange').isIn(['hour', 'day', 'week', 'month', 'year'])
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const adherenceMetrics = await analytics.getAdherenceMetrics(
        req.user!.id,
        req.query.medicationId as string,
        req.query.timeRange as TimeRange
      );
      res.json(adherenceMetrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get adherence metrics' });
    }
  }
);

router.get(
  '/medications/refills',
  requireAuth,
  [
    query('medicationId').optional().isString(),
    query('timeRange').isIn(['hour', 'day', 'week', 'month', 'year'])
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const refillMetrics = await analytics.getRefillMetrics(
        req.user!.id,
        req.query.medicationId as string,
        req.query.timeRange as TimeRange
      );
      res.json(refillMetrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get refill metrics' });
    }
  }
);

router.get(
  '/medications/interactions',
  requireAuth,
  [
    query('timeRange').isIn(['hour', 'day', 'week', 'month', 'year'])
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const interactionMetrics = await analytics.getInteractionMetrics(
        req.user!.id,
        req.query.timeRange as TimeRange
      );
      res.json(interactionMetrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get interaction metrics' });
    }
  }
);

router.get(
  '/system/metrics',
  requireAuth,
  [
    query('timeRange').isIn(['hour', 'day', 'week', 'month', 'year'])
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const systemMetrics = await analytics.getSystemMetrics(
        req.query.timeRange as TimeRange
      );
      res.json(systemMetrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get system metrics' });
    }
  }
);

router.post(
  '/export',
  requireAuth,
  [
    body('query').isObject(),
    body('options').isObject()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { query, options } = req.body;
      const exportData = await analytics.exportData(query, options);
      
      // Set appropriate headers based on export format
      switch (options.format) {
        case 'csv':
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
          break;
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', 'attachment; filename=analytics.json');
          break;
        case 'pdf':
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename=analytics.pdf');
          break;
      }

      res.send(exportData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export analytics data' });
    }
  }
);

// Analytics dashboard data;
router.get(
  '/dashboard',
  requireAuth,
  async (req: unknown, res: unknown) => {
    try {
      const { timeRange } = req.query;
      const startDate = new Date();
      let endDate = new Date();

      // Calculate start date based on time range;
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }

      const data = await analytics.getAnalyticsDashboardData({
        startDate,
        endDate,
        userId: req.user?.id
      });

      // Transform data for frontend dashboard;
      const transformedData = {
        adherenceData: data.eventCounts
          .filter(event => event.event_name === 'medication_taken')
          .map(event => ({
            date: event.created_at,
            adherenceRate: (event.properties.taken_count / event.properties.total_count) * 100,
            missedDoses: event.properties.total_count - event.properties.taken_count,
            totalDoses: event.properties.total_count
          })),

        familyActivity: await Promise.all(
          data.sessionStats.users.map(async (user: unknown) => ({
            userId: user.user_id,
            userName: user.user_name,
            activityCount: user.total_events,
            adherenceRate: user.medication_compliance,
            lastActive: user.last_active
          }))
        ),

        systemHealth: {
          metrics: [
            {
              name: 'API Response Time',
              value: data.performanceMetrics.find(m => m.metric_name === 'api_response_time')?.avg_value || 0,
              threshold: 1000,
              unit: 'ms'
            },
            {
              name: 'Page Load Time',
              value: data.performanceMetrics.find(m => m.metric_name === 'page_load_time')?.avg_value || 0,
              threshold: 3000,
              unit: 'ms'
            },
            {
              name: 'Error Rate',
              value: (data.errorCounts.reduce((acc, curr) => acc + curr.count, 0) / timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90),
              threshold: 5,
              unit: '/day'
            }
          ],
          lastUpdated: new Date().toISOString()
        },

        complianceByMedication: data.eventCounts
          .filter(event => event.event_name === 'medication_compliance')
          .map(event => ({
            medicationName: event.properties.medication_name,
            compliance: event.properties.compliance_rate,
            totalDoses: event.properties.total_doses,
            missedDoses: event.properties.missed_doses
          })),

        timeOfDayDistribution: data.eventCounts
          .filter(event => event.event_name === 'medication_taken')
          .reduce((acc, event) => {
            const hour = new Date(event.created_at).getHours();
            const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
            const existing = acc.find(slot => slot.timeSlot === timeSlot);
            
            if (existing) {
              existing.count += event.properties.taken_count;
              existing.compliance = (existing.count / (existing.count + event.properties.missed_count)) * 100;
            } else {
              acc.push({
                timeSlot,
                count: event.properties.taken_count,
                compliance: (event.properties.taken_count / (event.properties.taken_count + event.properties.missed_count)) * 100
              });
            }
            
            return acc;
          }, [] as { timeSlot: string; count: number; compliance: number}[])
          .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
      };

      res.json(transformedData);
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to get analytics dashboard data' });
    }
  }
);

export { router as analyticsRouter };
