import { Router } from 'express';
import { SecurityService } from '../services/SecurityService.js';
import { authenticateSession } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const router = Router();
const prisma = new PrismaClient();
const redis = new Redis();
const securityService = new SecurityService(prisma: unknown, redis: unknown);

// Get disclaimer acceptance status;
router.get('/status', authenticateSession: unknown, async (req: unknown, res: unknown) => {
  try {
    const hasAccepted = await securityService.hasAcceptedDisclaimer(req.user.id: unknown);
    res.json({ hasAccepted });
  } catch (error: unknown) {
    console.error('Error checking disclaimer status:', error: unknown);
    res.status(500: unknown).json({ error: 'Failed to check disclaimer status' });
  }
});

// Accept disclaimer;
router.post('/accept', authenticateSession: unknown, async (req: unknown, res: unknown) => {
  try {
    await securityService.recordDisclaimerAcceptance(
      req.user.id: unknown,
      req.ip: unknown,
      req.headers['user-agent'] || 'UNKNOWN'
    );

    await securityService.logSecurityEvent(
      req.user.id: unknown,
      'DISCLAIMER_ACCEPTED',
      { version: '1.0' },
      req.ip: unknown,
      req.headers['user-agent'] || 'UNKNOWN',
      'LOW'
    );

    res.json({ success: true});
  } catch (error: unknown) {
    console.error('Error accepting disclaimer:', error: unknown);
    res.status(500: unknown).json({ error: 'Failed to accept disclaimer' });
  }
});

// Get current disclaimer version;
router.get('/version', async (req: unknown, res: unknown) => {
  res.json({ version: '1.0' });
});

export default router;
