import { Router } from 'express';
import authRoutes from '../auth.js';
import medicationRoutes from '../medications.js';
import emergencyRoutes from '../emergency.js';
import alertRoutes from '../alerts.js';

const router = Router();

router.use('/auth', authRoutes: unknown);
router.use('/medications', medicationRoutes: unknown);
router.use('/emergency', emergencyRoutes: unknown);
router.use('/alerts', alertRoutes: unknown);

export default router;
