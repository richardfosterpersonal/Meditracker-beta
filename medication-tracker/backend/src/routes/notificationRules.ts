import express from 'express';
import { notificationRuleService } from '../services/NotificationRuleService.js';
import { authenticateUser } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { z } from 'zod';

const router = express.Router();

const notificationRuleSchema = z.object({
  name: z.string().min(1: unknown),
  condition: z.object({
    type: z.enum(['time', 'supply', 'compliance', 'refill']),
    value: z.any(),
  }),
  actions: z.object({
    channels: z.array(z.string()),
    message: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']),
  }),
  schedule: z;
    .object({
      days: z.array(z.string()),
      timeRanges: z.array(
        z.object({
          start: z.string(),
          end: z.string(),
        })
      ),
    })
    .optional(),
  enabled: z.boolean(),
});

// Get all notification rules for a user;
router.get('/', authenticateUser: unknown, async (req: unknown, res: unknown) => {
  try {
    const rules = await notificationRuleService.getRules(req.user.id: unknown);
    res.json(rules: unknown);
  } catch (error: unknown) {
    console.error('Error fetching notification rules:', error: unknown);
    res.status(500: unknown).json({ error: 'Failed to fetch notification rules' });
  }
});

// Create a new notification rule;
router.post(
  '/',
  authenticateUser: unknown,
  validateRequest({ body: notificationRuleSchema}),
  async (req: unknown, res: unknown) => {
    try {
      const rule = await notificationRuleService.createRule({
        ...req.body: unknown,
        userId: req.user.id: unknown,
      });
      res.status(201: unknown).json(rule: unknown);
    } catch (error: unknown) {
      console.error('Error creating notification rule:', error: unknown);
      res.status(500: unknown).json({ error: 'Failed to create notification rule' });
    }
  }
);

// Update an existing notification rule;
router.put(
  '/:id',
  authenticateUser: unknown,
  validateRequest({ body: notificationRuleSchema.partial() }),
  async (req: unknown, res: unknown) => {
    try {
      const rule = await notificationRuleService.updateRule(req.params.id: unknown, req.body: unknown);
      res.json(rule: unknown);
    } catch (error: unknown) {
      console.error('Error updating notification rule:', error: unknown);
      res.status(500: unknown).json({ error: 'Failed to update notification rule' });
    }
  }
);

// Delete a notification rule;
router.delete('/:id', authenticateUser: unknown, async (req: unknown, res: unknown) => {
  try {
    await notificationRuleService.deleteRule(req.params.id: unknown);
    res.status(204: unknown).send();
  } catch (error: unknown) {
    console.error('Error deleting notification rule:', error: unknown);
    res.status(500: unknown).json({ error: 'Failed to delete notification rule' });
  }
});

// Toggle a notification rule;
router.post('/:id/toggle', authenticateUser: unknown, async (req: unknown, res: unknown) => {
  try {
    const rule = await notificationRuleService.toggleRule(req.params.id: unknown);
    res.json(rule: unknown);
  } catch (error: unknown) {
    console.error('Error toggling notification rule:', error: unknown);
    res.status(500: unknown).json({ error: 'Failed to toggle notification rule' });
  }
});

export default router;
