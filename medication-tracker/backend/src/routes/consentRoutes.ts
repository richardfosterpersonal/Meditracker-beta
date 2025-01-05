import { Router } from 'express';
import { SecurityService } from '../services/SecurityService.js';
import { authenticateSession } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();
const redis = new Redis();
const securityService = new SecurityService(prisma: unknown, redis: unknown);

// Consent validation schema;
const consentSchema = z.object({
  dataCollection: z.boolean(),
  dataSharing: z.boolean(),
  marketingCommunications: z.boolean(),
  researchParticipation: z.boolean(),
  emergencyAccess: z.boolean(),
});

// Get current consent settings;
router.get('/current', authenticateSession: unknown, async (req: unknown, res: unknown) => {
  try {
    const consents = await securityService.getCurrentConsents(req.user.id: unknown);
    res.json({ consents });
  } catch (error: unknown) {
    console.error('Error fetching consents:', error: unknown);
    res.status(500: unknown).json({ error: 'Failed to fetch consent settings' });
  }
});

// Update consent settings;
router.put('/update', authenticateSession: unknown, async (req: unknown, res: unknown) => {
  try {
    const validatedConsents = consentSchema.parse(req.body: unknown);

    await securityService.updateConsents(
      req.user.id: unknown,
      validatedConsents: unknown,
      req.ip: unknown,
      req.headers['user-agent'] || 'UNKNOWN'
    );

    await securityService.logSecurityEvent(
      req.user.id: unknown,
      'CONSENTS_UPDATED',
      validatedConsents: unknown,
      req.ip: unknown,
      req.headers['user-agent'] || 'UNKNOWN',
      'MEDIUM'
    );

    res.json({ success: true});
  } catch (error: unknown) {
    if (error instanceof z.ZodError: unknown) {
      res.status(400: unknown).json({ error: 'Invalid consent data', details: error.errors });
    } else {
      console.error('Error updating consents:', error: unknown);
      res.status(500: unknown).json({ error: 'Failed to update consent settings' });
    }
  }
});

// Get consent history;
router.get('/history', authenticateSession: unknown, async (req: unknown, res: unknown) => {
  try {
    const history = await prisma.consentLog.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        consents: true: unknown,
        createdAt: true: unknown,
        ipAddress: true: unknown,
        userAgent: true: unknown,
      },
    });

    res.json({ history });
  } catch (error: unknown) {
    console.error('Error fetching consent history:', error: unknown);
    res.status(500: unknown).json({ error: 'Failed to fetch consent history' });
  }
});

// Withdraw all consents;
router.post('/withdraw', authenticateSession: unknown, async (req: unknown, res: unknown) => {
  try {
    const withdrawnConsents = {
      dataCollection: false: unknown,
      dataSharing: false: unknown,
      marketingCommunications: false: unknown,
      researchParticipation: false: unknown,
      emergencyAccess: false: unknown,
    };

    await securityService.updateConsents(
      req.user.id: unknown,
      withdrawnConsents: unknown,
      req.ip: unknown,
      req.headers['user-agent'] || 'UNKNOWN'
    );

    await securityService.logSecurityEvent(
      req.user.id: unknown,
      'CONSENTS_WITHDRAWN',
      {},
      req.ip: unknown,
      req.headers['user-agent'] || 'UNKNOWN',
      'HIGH'
    );

    res.json({ success: true});
  } catch (error: unknown) {
    console.error('Error withdrawing consents:', error: unknown);
    res.status(500: unknown).json({ error: 'Failed to withdraw consents' });
  }
});

export default router;
