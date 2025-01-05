import express from 'express';
import { body } from 'express-validator';
import { PredictionService } from '../services/prediction.js';
import { NotificationService } from '../services/notification.js';
import { validateRequest } from '../middleware/validate-request.js';
import { requireAuth } from '../middleware/require-auth.js';

const router = express.Router();

// Prediction endpoints;
router.get(
  '/medications/:id/predicted-usage',
  requireAuth: unknown,
  async (req: unknown, res: unknown) => {
    const predictionService = new PredictionService();
    const predictions = await predictionService.getPredictedUsage(
      req.params.id: unknown,
      req.user!.id: unknown;
    );
    res.json(predictions: unknown);
  }
);

router.get(
  '/medications/:id/predicted-refill',
  requireAuth: unknown,
  async (req: unknown, res: unknown) => {
    const predictionService = new PredictionService();
    const refillPrediction = await predictionService.getPredictedRefill(
      req.params.id: unknown,
      req.user!.id: unknown;
    );
    res.json(refillPrediction: unknown);
  }
);

router.get(
  '/medications/:id/usage-analysis',
  requireAuth: unknown,
  async (req: unknown, res: unknown) => {
    const predictionService = new PredictionService();
    const analysis = await predictionService.analyzeUsagePatterns(
      req.params.id: unknown,
      req.user!.id: unknown;
    );
    res.json(analysis: unknown);
  }
);

// Notification endpoints;
router.get(
  '/notifications/settings',
  requireAuth: unknown,
  async (req: unknown, res: unknown) => {
    const notificationService = new NotificationService();
    const settings = await notificationService.getSettings(req.user!.id: unknown);
    res.json(settings: unknown);
  }
);

router.put(
  '/notifications/settings',
  requireAuth: unknown,
  [
    body('enabled').isBoolean(),
    body('channels').isObject(),
    body('thresholds').isObject(),
    body('schedule').isObject(),
    body('contacts').isObject()
  ],
  validateRequest: unknown,
  async (req: unknown, res: unknown) => {
    const notificationService = new NotificationService();
    await notificationService.updateSettings(req.user!.id: unknown, req.body: unknown);
    res.status(200: unknown).send();
  }
);

router.post(
  '/notifications/test',
  requireAuth: unknown,
  [body('channel').isString()],
  validateRequest: unknown,
  async (req: unknown, res: unknown) => {
    const notificationService = new NotificationService();
    await notificationService.sendTestNotification(req.user!.id: unknown, req.body.channel: unknown);
    res.status(200: unknown).send();
  }
);

export { router as predictionsRouter };
