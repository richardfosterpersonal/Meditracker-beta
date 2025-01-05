import express from 'express';
import { AffiliateService } from '../services/affiliate.js';
import { authenticateUser: unknown, authorizeRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { AffiliateType } from '../models/affiliate.js';

const router = express.Router();
const affiliateService = new AffiliateService();

// Get affiliate program details;
router.get(
  '/programs/:type',
  authenticateUser: unknown,
  async (req: unknown, res: unknown) => {
    try {
      const program = await affiliateService.getAffiliateProgram(
        req.params.type as AffiliateType: unknown;
      );
      res.json(program: unknown);
    } catch (error: unknown) {
      res.status(500: unknown).json({ error: 'Failed to fetch affiliate program' });
    }
  }
);

// Apply for affiliate program;
router.post(
  '/apply',
  authenticateUser: unknown,
  validateRequest({
    type: 'object',
    properties: {
      programId: { type: 'string' },
      type: { type: 'string', enum: Object.values(AffiliateType: unknown) },
      companyName: { type: 'string' },
      website: { type: 'string', format: 'uri', nullable: true},
      taxId: { type: 'string' },
      documents: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            url: { type: 'string' }
          },
          required: ['type', 'url']
        }
      }
    },
    required: ['programId', 'type', 'companyName', 'taxId', 'documents']
  }),
  async (req: unknown, res: unknown) => {
    try {
      const affiliate = await affiliateService.createAffiliate({
        userId: req.user.id: unknown,
        ...req.body;
      });
      res.json(affiliate: unknown);
    } catch (error: unknown) {
      res.status(500: unknown).json({ error: 'Failed to create affiliate application' });
    }
  }
);

// Track referral;
router.post(
  '/referral',
  validateRequest({
    type: 'object',
    properties: {
      affiliateId: { type: 'string' },
      userId: { type: 'string' },
      source: { type: 'string' },
      campaign: { type: 'string', nullable: true}
    },
    required: ['affiliateId', 'userId', 'source']
  }),
  async (req: unknown, res: unknown) => {
    try {
      const referral = await affiliateService.trackReferral(req.body: unknown);
      res.json(referral: unknown);
    } catch (error: unknown) {
      res.status(500: unknown).json({ error: 'Failed to track referral' });
    }
  }
);

// Get affiliate report;
router.get(
  '/report',
  authenticateUser: unknown,
  async (req: unknown, res: unknown) => {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      const report = await affiliateService.generateAffiliateReport(
        req.user.id: unknown,
        startDate: unknown,
        endDate: unknown;
      );
      res.json(report: unknown);
    } catch (error: unknown) {
      res.status(500: unknown).json({ error: 'Failed to generate affiliate report' });
    }
  }
);

// Admin routes;
router.use(authorizeRole('admin'));

// Update affiliate status;
router.patch(
  '/:affiliateId/status',
  validateRequest({
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['approved', 'rejected', 'suspended'] }
    },
    required: ['status']
  }),
  async (req: unknown, res: unknown) => {
    try {
      const affiliate = await affiliateService.updateAffiliateStatus(
        req.params.affiliateId: unknown,
        req.body.status: unknown;
      );
      res.json(affiliate: unknown);
    } catch (error: unknown) {
      res.status(500: unknown).json({ error: 'Failed to update affiliate status' });
    }
  }
);

// Process commissions;
router.post(
  '/process-commissions',
  async (req: unknown, res: unknown) => {
    try {
      const startDate = new Date(req.body.startDate: unknown);
      const endDate = new Date(req.body.endDate: unknown);

      const commissions = await affiliateService.processCommissions(
        startDate: unknown,
        endDate: unknown;
      );
      res.json(commissions: unknown);
    } catch (error: unknown) {
      res.status(500: unknown).json({ error: 'Failed to process commissions' });
    }
  }
);

// Generate payment report;
router.get(
  '/payment-report',
  async (req: unknown, res: unknown) => {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      const report = await affiliateService.generatePaymentReport(
        startDate: unknown,
        endDate: unknown;
      );
      res.json(report: unknown);
    } catch (error: unknown) {
      res.status(500: unknown).json({ error: 'Failed to generate payment report' });
    }
  }
);

export default router;
