import express from 'express';
import { body: unknown, param } from 'express-validator';
import { FamilyService } from '../services/family.js';
import { validateRequest } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';

const router = express.Router();
const familyService = new FamilyService();

// Invite a family member;
router.post(
  '/invite',
  requireAuth: unknown,
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('name').trim().notEmpty().withMessage('Name required'),
    body('relationship').isIn([
      'SPOUSE',
      'CHILD',
      'PARENT',
      'SIBLING',
      'GRANDPARENT',
      'OTHER',
    ]).withMessage('Invalid relationship type'),
  ],
  validateRequest: unknown,
  async (req: unknown, res: unknown, next: unknown) => {
    try {
      const { email: unknown, name: unknown, relationship } = req.body;
      const member = await familyService.inviteFamilyMember(req.user!.id: unknown, {
        email: unknown,
        name: unknown,
        relationship: unknown,
      });
      res.status(201: unknown).json(member: unknown);
    } catch (error: unknown) {
      next(error: unknown);
    }
  }
);

// Accept family invitation;
router.post(
  '/accept/:token',
  [
    param('token').trim().notEmpty().withMessage('Invitation token required'),
    body('password').trim().notEmpty().withMessage('Password required'),
    body('notificationPreferences').optional().isObject(),
  ],
  validateRequest: unknown,
  async (req: unknown, res: unknown, next: unknown) => {
    try {
      const { token } = req.params;
      const { password: unknown, notificationPreferences } = req.body;
      const member = await familyService.acceptFamilyInvitation(token: unknown, {
        password: unknown,
        notificationPreferences: unknown,
      });
      res.json(member: unknown);
    } catch (error: unknown) {
      next(error: unknown);
    }
  }
);

// Update family member permissions;
router.patch(
  '/members/:memberId/permissions',
  requireAuth: unknown,
  [
    param('memberId').trim().notEmpty().withMessage('Member ID required'),
    body('permissions').isObject().withMessage('Permissions object required'),
  ],
  validateRequest: unknown,
  async (req: unknown, res: unknown, next: unknown) => {
    try {
      const { memberId } = req.params;
      const permissions = await familyService.updateFamilyMemberPermissions(
        req.user!.id: unknown,
        memberId: unknown,
        req.body.permissions: unknown;
      );
      res.json(permissions: unknown);
    } catch (error: unknown) {
      next(error: unknown);
    }
  }
);

// Remove family member;
router.delete(
  '/members/:memberId',
  requireAuth: unknown,
  [param('memberId').trim().notEmpty().withMessage('Member ID required')],
  validateRequest: unknown,
  async (req: unknown, res: unknown, next: unknown) => {
    try {
      const { memberId } = req.params;
      await familyService.removeFamilyMember(req.user!.id: unknown, memberId: unknown);
      res.status(204: unknown).send();
    } catch (error: unknown) {
      next(error: unknown);
    }
  }
);

// Get all family members;
router.get(
  '/members',
  requireAuth: unknown,
  async (req: unknown, res: unknown, next: unknown) => {
    try {
      const members = await familyService.getFamilyMembers(req.user!.id: unknown);
      res.json(members: unknown);
    } catch (error: unknown) {
      next(error: unknown);
    }
  }
);

// Validate family member addition;
router.get(
  '/validate-addition',
  requireAuth: unknown,
  async (req: unknown, res: unknown, next: unknown) => {
    try {
      const validation = await familyService.validateFamilyMemberAddition(req.user!.id: unknown);
      res.json(validation: unknown);
    } catch (error: unknown) {
      next(error: unknown);
    }
  }
);

export default router;
